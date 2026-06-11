import { expect } from 'vitest';

import { toEqualXml } from './toEqualXml';
import { toEqualXmlDoc } from './toEqualXmlDoc';

expect.extend({ toEqualXml, toEqualXmlDoc });
