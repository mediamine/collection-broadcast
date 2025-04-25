import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Channel, ChannelModel, connect, Replies } from 'amqplib';
import { RABBITMQ_CONNECTION_URL, RABBITMQ_QUEUE_NAME } from 'src/constant';
import { WinstonLoggerService } from 'src/logger';

@Injectable()
export class RabbitMQService {
  connection!: ChannelModel;
  channel!: Channel;
  private connected!: boolean;

  constructor(
    private configService: ConfigService,
    private logger: WinstonLoggerService
  ) {
    this.logger.setContext(RabbitMQService.name);
  }

  async initialize() {
    if (this.connected && this.channel) return;

    const connectionUrl = this.configService.get<string>(RABBITMQ_CONNECTION_URL);
    if (!connectionUrl) {
      this.logger.error('RabbitMQ connection URL is not defined.');
      throw new Error('RabbitMQ connection URL is not defined');
    }

    this.logger.debug('Starting a RabbitMQ connection.');
    try {
      this.connection = await connect(connectionUrl);
      this.channel = await this.connection.createChannel();
      this.connected = true;
      this.logger.debug('RabbitMQ connection established.');
    } catch (error) {
      this.connected = false;
      this.logger.error('Error connecting to RabbitMQ', error);
      throw new Error('RabbitMQ connection failed');
    }
  }

  async consume(callback: (msg: any) => void): Promise<Replies.Consume> {
    const queueName = this.configService.get<string>(RABBITMQ_QUEUE_NAME);

    await this.checkConnection(queueName);

    return this.channel.consume(
      queueName,
      (msg) => {
        if (!msg) {
          this.logger.error('Received null message from RabbitMQ');
          return;
        }

        this.logger.debug(`Received from RabbitMQ: ${msg.content.toString()}`);
        callback(msg);
        this.channel.ack(msg);
      },
      { noAck: false }
    );
  }

  async cancelConsumer(consumerTag: string): Promise<Replies.Empty> {
    const queueName = this.configService.get<string>(RABBITMQ_QUEUE_NAME);

    await this.checkConnection(queueName);

    return this.channel.cancel(consumerTag);
  }

  async closeConnection() {
    const queueName = this.configService.get<string>(RABBITMQ_QUEUE_NAME);

    await this.checkConnection(queueName);

    this.logger.debug('Closing RabbitMQ connection.');
    this.connected = false;
    await this.connection.close();
  }

  private async checkConnection(queueName: string) {
    if (!this.connected || !this.channel) {
      this.logger.error('RabbitMQ connection is not established.');
      throw new Error('RabbitMQ connection is not established');
    }

    if (!queueName) {
      this.logger.error('RabbitMQ queue name is not defined.');
      throw new Error('RabbitMQ queue name is not defined');
    }

    await this.channel.assertQueue(queueName, {
      durable: false
    });
  }
}
