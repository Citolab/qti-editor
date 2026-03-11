import { Component } from '@angular/core';
import { EditorComponent } from './editor/editor.component';

@Component({
  selector: 'app-root',
  imports: [EditorComponent],
  template: `
    <main class="min-h-screen container mx-auto max-w-6xl px-6 pb-12">
      <app-editor></app-editor>
    </main>
  `,
})
export class App {}
