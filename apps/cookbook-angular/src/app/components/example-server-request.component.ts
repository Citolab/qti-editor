import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-example-server-request',
  standalone: true,
  template: `
    <section class="card bg-base-100 border border-base-300 p-4 space-y-3">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <h3 class="text-sm font-semibold">Example Server Request</h3>
        <button
          class="btn btn-sm btn-secondary"
          type="button"
          [disabled]="isSendingCode || !hasCodePayload"
          (click)="sendRequest.emit()"
        >
          {{ isSendingCode ? 'Sending...' : 'Send XML to API' }}
        </button>
      </div>
      <p class="text-xs text-base-content/70">
        Last payload timestamp:
        {{ latestCodeTimestampLabel }}
      </p>
      <p class="text-xs text-base-content/70">
        Endpoint: <code>{{ endpoint }}</code>
      </p>
      <p class="text-xs">{{ requestStatus }}</p>
    </section>
  `,
})
export class ExampleServerRequestComponent {
  @Input() public isSendingCode = false;
  @Input() public hasCodePayload = false;
  @Input() public latestCodeTimestampLabel = 'No code payload yet.';
  @Input() public endpoint = '';
  @Input() public requestStatus = 'No request sent yet.';

  @Output() public sendRequest = new EventEmitter<void>();
}
