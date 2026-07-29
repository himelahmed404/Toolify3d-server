import { EventEmitter } from 'events';

export const orderEvents = new EventEmitter();

export function emitOrderCreated(payload) {
  orderEvents.emit('order:created', payload);
}

export function emitOrderStatusChanged(payload) {
  orderEvents.emit('order:status_changed', payload);
}
