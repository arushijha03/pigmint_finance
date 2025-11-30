import { PubSub } from '@google-cloud/pubsub';
import dotenv from 'dotenv';

dotenv.config();

let pubSubClient: PubSub | null = null;

export const getPubSubClient = () => {
  if (!pubSubClient && process.env.GOOGLE_CLOUD_PROJECT) {
    try {
      pubSubClient = new PubSub({
        projectId: process.env.GOOGLE_CLOUD_PROJECT,
      });
      console.log('Pub/Sub client initialized');
    } catch (error) {
      console.error('Failed to initialize Pub/Sub client:', error);
    }
  }
  return pubSubClient;
};

export const publishMessage = async (topicName: string, data: any) => {
  const client = getPubSubClient();

  if (!client) {
    console.warn('Pub/Sub not configured, skipping message publish');
    return null;
  }

  try {
    const topic = client.topic(topicName);
    const messageBuffer = Buffer.from(JSON.stringify(data));
    const messageId = await topic.publishMessage({ data: messageBuffer });
    console.log(`Message ${messageId} published to ${topicName}`);
    return messageId;
  } catch (error) {
    console.error('Error publishing message:', error);
    throw error;
  }
};
