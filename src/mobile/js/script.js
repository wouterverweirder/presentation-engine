import Presentation from './classes/Presentation';
import fetch from 'isomorphic-fetch';

(() => {

  const init = () => {
    const settings = {
      presentationPath: `/`,
      mobileServerUrl: ``
    };
    //get slides by xmlhttprequest
    fetch(`/data.json?t=${  Date.now()}`)
      .then(data => data.json())
      .then(data => {
        new Presentation(data, `mobile`, settings);
      });
  };

  init();
})();
