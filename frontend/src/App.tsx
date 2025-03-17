import { useState, useRef, } from 'react';

// 手順 1. でメモした値を設定
const AppSyncHttpEndpoint = import.meta.env.VITE_APPSYNC_HTTP_ENDPOINT;
const AppSyncRealtimeEndpoint = import.meta.env.VITE_APPSYNC_REALTIME_ENDPOINT;
const AppSyncApiKey = import.meta.env.VITE_APPSYNC_API_KEY;
const ChannelNamespace = import.meta.env.VITE_APPSYNC_CHANNEL_NAMESPACE || 'default';

let instance: WebSocket | null = null;

// WebSocket オブジェクトを生成。すでに作成済みであればそちらを返す
const getWebSocketInstance = (url: string, protocols?: string | string[]): WebSocket => {
  if (!(instance instanceof WebSocket)) {
    instance = new WebSocket(url, protocols);
  }
  else if (instance.readyState === WebSocket.CLOSED || instance.readyState === WebSocket.CLOSING) {
    instance = new WebSocket(url, protocols);
  }
  return instance;
};

function App() {

  // Publish、Subscribe に使用するチャネル名
  const [channel, setChannel] = useState<string>(`/${ChannelNamespace}/test`);

  // Subscribe した際の ID
  const [subscriptionId, setSubscriptionId] = useState<string>('N/A');

  // Publish するメッセージ
  const [publishMessage, setPublishMessage] = useState<string>('');

  // Subscribe により受信したメッセージのリスト
  const [receivedEvents, setReceivedEvents] = useState<object[]>([]);

  // WebSocket サブプロトコルに設定するヘッダコンテンツ
  // 詳細 : https://docs.aws.amazon.com/appsync/latest/eventapi/event-api-websocket-protocol.html#authorization-formatting-by-mode
  const headerInfo = {
    "host": AppSyncHttpEndpoint,
    "x-api-key": AppSyncApiKey,
  };
  // 認証情報は Base64URL 形式でエンコードする
  // https://docs.aws.amazon.com/appsync/latest/eventapi/event-api-websocket-protocol.html#websocket-connection-handshake
  const encodedHeaderInfo = btoa(JSON.stringify(headerInfo)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  // WebSocket 接続を生成・取得。URL はリアルタイムエンドポイントを指定。
  // 認証情報はサブプロトコルとして指定する。
  const ws = getWebSocketInstance(
    `wss://${AppSyncRealtimeEndpoint}/event/realtime`,
    [
      'aws-appsync-event-ws',
      `header-${encodedHeaderInfo}`
    ]
  );

  // https://docs.aws.amazon.com/appsync/latest/eventapi/event-api-websocket-protocol.html#message-details
  // WebSocket が確立したら init メッセージを送信
  ws.onopen = (event) => {
    console.log('open');
    console.log(event);
    ws.send(JSON.stringify({ "type": "connection_init" }));
  };

  ws.onmessage = (event) => {
    console.log(event);
    const message = JSON.parse(event.data);

    switch (message.type) {
      case 'connection_ack':
        // init メッセージの送信結果として接続確認メッセージが返ってきた時
        break;

      case 'subscribe_success':
        // Subscribe に成功した時
        // Subscribe を解除 (Unsubscribe) する際に必要になるため保管しておく
        setSubscriptionId(message.id);
        break;

      case 'subscribe_error':
        // Subscribe に失敗した時
        break;

      case 'data':
        // Subscribe によりメッセージを受信した時
        setReceivedEvents((currentEvents) => {return [... currentEvents, message.event]});
        break;

      case 'broadcast_error':
        // ブロードキャストエラーなどが発生した場合、クライアントでエラーを受信することがある
        break;

      case 'unsubscribe_success':
        // Subscribe 解除に成功した時
        // 保管していた Subscription ID をリセット
        setSubscriptionId('N/A');
        break;

      case 'unsubscribe_error':
        // Subscribe 解除でエラーが発生した時
        break;

      case 'publish_success':
        // Publish に成功した時 (リアルタイムエンドポイント、すなわち WebSocket 経由で Publish した時の応答)
        // `id` に Publish した際の id が設定されている (`successful[].identifier` は別の固有の値)
        break;

      case 'publish_error':
        // Publish でエラーが発生した場合 (リアルタイムエンドポイント、すなわち WebSocket 経由で Publish した時の応答)
        break;

      case 'ka':
        // 接続維持のため、AppSync から Keep-Alive メッセージ (60秒間隔) を受信した時
        // 初期化時に得られる `connectionTimeoutMs` のタイマーをリセットしたりすると良さそう
        break;

      default:
        break;
    }
  };

  const wsRef = useRef(ws);

  const onClickSubscribe = () => {
    // Subscribe を開始する
    wsRef.current.send(JSON.stringify({
      "type": "subscribe",
      "id": crypto.randomUUID(),
      "channel": channel,
      "authorization": {
        "host": AppSyncHttpEndpoint,
        "x-api-key": AppSyncApiKey,
      }
    }));
  };

  const onClickUnsubscribe = () => {
    // Subscribe を解除 (Unsubscribe) する
    wsRef.current.send(JSON.stringify({
      "type": "unsubscribe",
      "id": subscriptionId,
    }));
  };

  const onClickPublishViaRealtime = () => {
    // メッセージを Publish する (リアルタイムエンドポイントを使用した WebSocket による Publish)
    // https://docs.aws.amazon.com/appsync/latest/eventapi/publish-websocket.html
    wsRef.current.send(JSON.stringify({
      "type": "publish",
      "id": crypto.randomUUID(),
      "channel": channel,
        "events": [ JSON.stringify(publishMessage) ],
      "authorization": {
        "host": AppSyncHttpEndpoint,
        "x-api-key": AppSyncApiKey,
      }
    }));
  };

  const onClickPublishViaHttp = () => {
    // メッセージを Publish する (HTTP エンドポイントを使用した Publish)
    // https://docs.aws.amazon.com/appsync/latest/eventapi/publish-http.html
    fetch(`https://${AppSyncHttpEndpoint}/event`, {
      "method": "POST",
      "headers": {
        "content-type": "application/json",
        "x-api-key": AppSyncApiKey,
      },
      "body": JSON.stringify({
        "channel": channel,
        "events": [ JSON.stringify(publishMessage) ]
      })
    })
    .then((value) => {
      console.log(value);
    }, (reason) => {
      console.error(reason);
    });
  };

  return (
    <>
      <h1>AppSync Events Demo without Amplify</h1>
      <div>
        <label>Channel: </label>
        <input type="text" value={ channel } onChange={(event) => setChannel(event.target.value)} />
        <button onClick={ onClickSubscribe }>
          Subscribe
        </button>
      </div>
      <hr />
      <div>
        <label>Subscription ID: </label>
        <span>{subscriptionId}</span>
        <button onClick={ onClickUnsubscribe }>
          Unsubscribe
        </button>
      </div>
      <hr />
      <div>
        <input type="text" value={ publishMessage } onChange={ (event) => setPublishMessage(event.target.value) } />
        <button onClick={ onClickPublishViaRealtime }>
          Publish (Realtime Endpoint)
        </button>
        <button onClick={ onClickPublishViaHttp }>
          Publish (HTTP Endpoint)
        </button>
      </div>
      <hr />
      <div>
        <ul>
          {
            receivedEvents.map((message, index) => {
              return <li key={ index }>{ message.toString() }</li>
            })
          }
        </ul>
      </div>
    </>
  )
}

export default App
