import { Injectable } from '@nestjs/common';

import { INodeHandler } from '../interfaces/node-handler.interface';
import { HttpRequestHandler } from '../handlers/http-request.handler';
import { DelayHandler } from '../handlers/delay.handler';
import { ConditionHandler } from '../handlers/condition.handler';
import { VariableHandler } from '../handlers/variable.handler';
import { SlackHandler } from '../handlers/slack.handler';
import { EmailHandler } from '../handlers/email.handler';
import { SheetsHandler } from '../handlers/sheets.handler';
import { WebhookHandler } from '../handlers/webhook.handler';

@Injectable()
export class NodeHandlerRegistryService {
  private readonly handlers = new Map<string, INodeHandler>();

  constructor(
    httpRequestHandler: HttpRequestHandler,
    delayHandler: DelayHandler,
    conditionHandler: ConditionHandler,
    variableHandler: VariableHandler,
    slackHandler: SlackHandler,
    emailHandler: EmailHandler,
    sheetsHandler: SheetsHandler,
    webhookHandler: WebhookHandler,
  ) {
    this.handlers.set('http', httpRequestHandler);
    this.handlers.set('delay', delayHandler);
    this.handlers.set('condition', conditionHandler);
    this.handlers.set('ifElse', conditionHandler);
    this.handlers.set('variable', variableHandler);
    this.handlers.set('slack', slackHandler);
    this.handlers.set('email', emailHandler);
    this.handlers.set('sheets', sheetsHandler);
    this.handlers.set('webhook', webhookHandler);
  }

  getHandler(nodeType: string): INodeHandler | null {
    return this.handlers.get(nodeType) ?? null;
  }

  hasHandler(nodeType: string): boolean {
    return this.handlers.has(nodeType);
  }
}


