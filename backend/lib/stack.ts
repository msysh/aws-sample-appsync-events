import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';

export class Stack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const apiName = this.node.tryGetContext('apiName') || 'AppSyncEventsDemo';
    const channelName = this.node.tryGetContext('channelName') || 'default';

    const api = new cdk.aws_appsync.CfnApi(this, 'Api', {
      name: apiName,
      eventConfig: {
        authProviders:[{
          authType: 'API_KEY',
        }],
        connectionAuthModes: [{
          authType: 'API_KEY',
        }],
        defaultPublishAuthModes: [{
          authType: 'API_KEY',
        }],
        defaultSubscribeAuthModes: [{
          authType: 'API_KEY',
        }],
      },
    });

    const channelNamespace = new cdk.aws_appsync.CfnChannelNamespace(this, 'ChannelNamespace', {
      apiId: api.attrApiId,
      name: channelName,
    });

    const apiKey = new cdk.aws_appsync.CfnApiKey(this, 'ApiKey', {
      apiId: api.attrApiId,
      expires: Math.floor(Date.now() / 1000 + (30 * 24 * 60 * 60))
    });

    new cdk.CfnOutput(this, 'Output-AppSyncHttpEndpoint', {
      description: 'AppSync HTTP Endpoint',
      value: api.attrDnsHttp,
    });

    new cdk.CfnOutput(this, 'Output-AppSyncRealtimeEndpoint', {
      description: 'AppSync Realtime Endpoint',
      value: api.attrDnsRealtime
    });

    new cdk.CfnOutput(this, 'Output-AppSyncApiName', {
      description: 'AppSync API Name',
      value: api.name,
    });

    new cdk.CfnOutput(this, 'Output-AppSyncChannelNamespace', {
      description: 'AppSync Channel Namespace',
      value: channelNamespace.name,
    });

    new cdk.CfnOutput(this, 'Output-ApiKey', {
      description: 'AppSync API Key',
      value: apiKey.attrApiKey
    });
  }
}
