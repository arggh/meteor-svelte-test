import { Meteor } from "meteor/meteor";
import { onPageLoad } from "meteor/server-render";
import App from '/components/App.html';

onPageLoad((sink) => {
  const { html, css } = App.render();

  sink.appendToHead(`<style>${css.code}</style>`);
  sink.renderIntoElementById('main', html);
});