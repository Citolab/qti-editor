import { css, unsafeCSS, type CSSResultGroup } from 'lit';
import rawStyles from './core-css.css?raw';

const styles = css`${unsafeCSS(rawStyles)}`;

export default styles as CSSResultGroup;
