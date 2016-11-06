import $ from 'jquery';
import bean from 'bean';
import io from 'socket.io-client';
import _ from 'lodash';

window.$ = window.jQuery = $;
window.bean = bean;
window.io = io;
window._ = _;

window.Tether = require(`tether`);
require(`../../vendors/bootstrap-4.0.0-alpha.2/dist/js/bootstrap`);

window.CodeMirror = require(`../../../node_modules/codemirror/lib/codemirror.js`);
require(`../../../node_modules/codemirror/mode/javascript/javascript.js`);
require(`../../../node_modules/codemirror/mode/htmlmixed/htmlmixed.js`);
require(`../../../node_modules/codemirror/mode/clike/clike.js`);
require(`../../../node_modules/codemirror/addon/hint/show-hint.js`);
require(`../../../node_modules/codemirror/addon/hint/javascript-hint.js`);

require(`../../../node_modules/@shagstrom/split-pane/split-pane.js`);
