import { useState, useRef, } from 'react';

const AppSyncHttpEndpoint = import.meta.env.VITE_APPSYNC_HTTP_ENDPOINT;
const AppSyncRealtimeEndpoint = import.meta.env.VITE_APPSYNC_REALTIME_ENDPOINT;
const AppSyncApiKey = import.meta.env.VITE_APPSYNC_API_KEY;
const ChannelNamespace = import.meta.env.VITE_APPSYNC_CHANNEL_NAMESPACE || 'default';


let instance: WebSocket | null = null;

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

  const [channel, setChannel] = useState<string>(`/${ChannelNamespace}/test`);
  const [subscriptionId, setSubscriptionId] = useState<string>('N/A');
  const [publishMessage, setPublishMessage] = useState<string>('');
  const [receivedEvents, setReceivedEvents] = useState<object[]>([]);

  const headerInfo = {
    "host": AppSyncHttpEndpoint,
    "x-api-key": AppSyncApiKey,
  };
  const encodedHeaderInfo = btoa(JSON.stringify(headerInfo)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  const ws = getWebSocketInstance(
    `wss://${AppSyncRealtimeEndpoint}/event/realtime`,
    [
      'aws-appsync-event-ws',
      `header-${encodedHeaderInfo}`
    ]
  );

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
        break;
      case 'subscribe_success':
        setSubscriptionId(message.id);
        break;
      case 'subscribe_error':
        break;
      case 'data':
        setReceivedEvents((currentEvents) => {return [... currentEvents, message.event]});
        break;
      case 'broadcast_error':
        break;
      case 'unsubscribe_success':
        setSubscriptionId('N/A');
        break;
      case 'unsubscribe_error':
        break;
      case 'ka':
        break;
      default:
        break;
    }
  };

  const wsRef = useRef(ws);

  const onClickSubscribe = () => {
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
    wsRef.current.send(JSON.stringify({
      "type": "unsubscribe",
      "id": subscriptionId,
    }));
  };

  const onClickPublish = () => {

    /*
    wsRef.current.send(JSON.stringify({
      "type": "publish",
      "id": crypto.randomUUID(),
      "channel": channel,
        "events": ["message"],
      "authorization": {
        "host": AppSyncHttpEndpoint,
        "x-api-key": AppSyncApiKey,
      }
    }));
    */
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
  }

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
        <button onClick={ onClickPublish }>
          Publish Message
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
