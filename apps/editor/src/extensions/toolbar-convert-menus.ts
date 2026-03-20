import type { ToolbarInsertMenu } from '../components/editor/toolbar';
import {
  canConvertFlatListToChoiceInteraction,
  convertFlatListToChoiceInteraction
} from '@qti-editor/interactions-qti-choice';

export const toolbarConvertMenus: ToolbarInsertMenu[] = [
  {
    id: 'qti-convert',
    tooltip: 'Convert Selection',
    icon: 'i-lucide-arrow-right-left size-5 block',
    hideWhenEmpty: false,
    getItems: view => [
      {
        label: 'Flat List -> Choice Interaction',
        canInsert: canConvertFlatListToChoiceInteraction(view),
        command: () => {
          convertFlatListToChoiceInteraction(view);
        }
      }
    ]
  }
];
