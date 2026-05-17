/**
 * Event Sourcing Layer — All protocol state changes emit typed events.
 * The event log is the single source of truth for system reconstruction.
 */
import { EventEmitter } from "node:events";
import { newId, now } from "./ids.js";

export type ProtocolEventType =
  | "AgentRegistered"
  | "ServiceListed"
  | "ServiceDelisted"
  | "NegotiationStarted"
  | "NegotiationCompleted"
  | "AgreementCreated"
  | "EscrowLocked"
  | "EscrowSettled"
  | "EscrowRefunded"
  | "EscrowDisputed"
  | "ExecutionStarted"
  | "ExecutionCompleted"
  | "ExecutionFailed"
  | "ProofSubmitted"
  | "ProofVerified"
  | "ArbitrationRequested"
  | "ArbitrationIssued"
  | "ArbitrationAppealed"
  | "SettlementExecuted"
  | "ReputationUpdated"
  | "SkillInvoked"
  | "WorkflowStarted"
  | "WorkflowCompleted"
  | "WorkflowFailed"
  | "PinSubmitted"
  | "PinConfirmed";

export interface ProtocolEvent<T = unknown> {
  event_id: string;
  type: ProtocolEventType;
  timestamp: number;
  agent_id?: string;
  agreement_id?: string;
  correlation_id?: string;
  payload: T;
  signature?: string;
}

export class EventBus extends EventEmitter {
  private log: ProtocolEvent[] = [];
  private sealed = false;

  emit_event<T>(type: ProtocolEventType, payload: T, meta?: Partial<Pick<ProtocolEvent, "agent_id" | "agreement_id" | "correlation_id" | "signature">>): ProtocolEvent<T> {
    if (this.sealed) throw new Error("EventBus is sealed — no further events accepted");
    const event: ProtocolEvent<T> = {
      event_id: newId("evt"),
      type,
      timestamp: now(),
      payload,
      ...meta,
    };
    this.log.push(event as ProtocolEvent);
    this.emit(type, event);
    this.emit("*", event);
    return event;
  }

  history(filter?: { type?: ProtocolEventType; agent_id?: string; agreement_id?: string; after?: number }): ProtocolEvent[] {
    return this.log.filter((e) => {
      if (filter?.type && e.type !== filter.type) return false;
      if (filter?.agent_id && e.agent_id !== filter.agent_id) return false;
      if (filter?.agreement_id && e.agreement_id !== filter.agreement_id) return false;
      if (filter?.after && e.timestamp <= filter.after) return false;
      return true;
    });
  }

  count(): number {
    return this.log.length;
  }

  seal(): void {
    this.sealed = true;
  }

  export(): ProtocolEvent[] {
    return [...this.log];
  }

  /** Replay events into a handler for state reconstruction */
  replay(handler: (event: ProtocolEvent) => void): void {
    for (const e of this.log) handler(e);
  }
}

/** Global singleton for protocol-wide event bus */
let _bus: EventBus | undefined;
export const getEventBus = (): EventBus => {
  if (!_bus) _bus = new EventBus();
  return _bus;
};
export const resetEventBus = (): EventBus => {
  _bus = new EventBus();
  return _bus;
};
