import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';

export class Stack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const apiName = this.node.tryGetContext('apiName') || 'AppSyncEventsDemo';
    const channelName = this.node.tryGetContext('channelName') || 'default';

    // -----------------------------
    // AppSync Events
    // -----------------------------
    const api = new cdk.aws_appsync.EventApi(this, 'EventApi', {
      apiName: apiName,
      authorizationConfig: {
        authProviders: [{
          authorizationType: cdk.aws_appsync.AppSyncAuthorizationType.API_KEY,
          apiKeyConfig: {
            expires: cdk.Expiration.after(cdk.Duration.days(30)),
          },
        }],
        connectionAuthModeTypes: [
          cdk.aws_appsync.AppSyncAuthorizationType.API_KEY,
        ],
        defaultPublishAuthModeTypes: [
          cdk.aws_appsync.AppSyncAuthorizationType.API_KEY,
        ],
        defaultSubscribeAuthModeTypes: [
          cdk.aws_appsync.AppSyncAuthorizationType.API_KEY,
        ]
      },
      logConfig: {
        fieldLogLevel: cdk.aws_appsync.AppSyncFieldLogLevel.INFO,
        retention: cdk.aws_logs.RetentionDays.THREE_MONTHS,
      },
    });

    // -----------------------------
    // Appsync Event Channel Namespace
    // -----------------------------
    const channelNamespace = api.addChannelNamespace(channelName);

    // -----------------------------
    // Outputs
    // -----------------------------
    new cdk.CfnOutput(this, 'Output-AppSyncApiId', {
      description: 'AppSync Events API ID',
      value: api.apiId,
    });

    new cdk.CfnOutput(this, 'Output-AppSyncApiName', {
      description: 'AppSync Events API Name',
      value: (api.node.defaultChild as cdk.aws_appsync.CfnApi).name,
    });

    new cdk.CfnOutput(this, 'Output-AppSyncChannelNamespace', {
      description: 'AppSync Events Channel Namespace',
      value: (channelNamespace.node.defaultChild as cdk.aws_appsync.CfnChannelNamespace).name,
    });

    new cdk.CfnOutput(this, 'Output-AppSyncHttpEndpoint', {
      description: 'AppSync Events HTTP Endpoint',
      value: api.httpDns,
    });

    new cdk.CfnOutput(this, 'Output-AppSyncRealtimeEndpoint', {
      description: 'AppSync Events Realtime Endpoint',
      value: api.realtimeDns
    });

    new cdk.CfnOutput(this, 'Output-AppSyncApiKey', {
      description: 'AppSync Events API Key',
      value: api.apiKeys['Default'].attrApiKey,
    });

    new cdk.CfnOutput(this, 'Output-AppSyncLogGroupName', {
      description: 'AppSync Events LogGroup Name',
      value: api.logGroup.logGroupName,
    });
  }
}
