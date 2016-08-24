import Presentation from './classes/Presentation';
import SlidesFolderParser from '../../server/classes/SlidesFolderParser';

(() => {

  const remote = requireNode('electron').remote;
  const presentationPath = remote.getGlobal('__dirname');
  const path = requireNode('path');

  const init = () => {
    let settings = {
      presentationPath: presentationPath,
      // mobileServerUrl: 'https://bbridges.herokuapp.com',
      mobileServerUrl: 'http://localhost:5000',
      mobileServerUsername: 'wouter.verweirder@gmail.com',
      mobileServerPassword: 'geheim'
    };
    let slidesFolderParser = new SlidesFolderParser();
    slidesFolderParser.parse(presentationPath, path.resolve(presentationPath, 'slides'))
      .then(data => {
        new Presentation(data, 'presentation', settings);
      });
  };

  init();
})();
