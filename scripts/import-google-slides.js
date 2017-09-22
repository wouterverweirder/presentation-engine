const path = require(`path`);
const fs = require(`fs`);
const readline = require(`readline`);
const google = require(`googleapis`);
const googleAuth = require(`google-auth-library`);
const padStart = require('string.prototype.padstart');

const argv = require(`yargs`)
  .usage(`Usage: $0 -id [string]`)
  .demandOption([`id`])
  .argv;

const SLIDES_PATH = `${path.resolve(__dirname, `..`, `dist`, `presentation`, `slides`)}/`;

// If modifying these scopes, delete your previously saved credentials
// at ~/.credentials/slides.googleapis.com-nodejs-quickstart.json
const SCOPES = [`https://www.googleapis.com/auth/presentations.readonly`];
const TOKEN_DIR = `${path.resolve(__dirname, `..`, `private-keys`)}/`;
const TOKEN_PATH = `${TOKEN_DIR  }google-slides-token.json`;

// Load client secrets from a local file.
fs.readFile(`${TOKEN_DIR  }google-slides.json`, function processClientSecrets(err, content) {
  if (err) {
    console.log(`Error loading client secret file: ${  err}`);
    return;
  }
  // Authorize a client with the loaded credentials, then call the
  // Google Slides API.
  authorize(JSON.parse(content), downloadSlides);
});

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 *
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
const authorize = (credentials, callback) => {
  const clientSecret = credentials.installed.client_secret;
  const clientId = credentials.installed.client_id;
  const redirectUrl = credentials.installed.redirect_uris[0];
  const auth = new googleAuth();
  const oauth2Client = new auth.OAuth2(clientId, clientSecret, redirectUrl);

  // Check if we have previously stored a token.
  fs.readFile(TOKEN_PATH, function(err, token) {
    if (err) {
      getNewToken(oauth2Client, callback);
    } else {
      oauth2Client.credentials = JSON.parse(token);
      callback(oauth2Client);
    }
  });
};

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 *
 * @param {google.auth.OAuth2} oauth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback to call with the authorized
 *     client.
 */
const getNewToken = (oauth2Client, callback) => {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: `offline`,
    scope: SCOPES
  });
  console.log(`Authorize this app by visiting this url: `, authUrl);
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  rl.question(`Enter the code from that page here: `, function(code) {
    rl.close();
    oauth2Client.getToken(code, function(err, token) {
      if (err) {
        console.log(`Error while trying to retrieve access token`, err);
        return;
      }
      oauth2Client.credentials = token;
      storeToken(token);
      callback(oauth2Client);
    });
  });
};

/**
 * Store token to disk be used in later program executions.
 *
 * @param {Object} token The token to store to disk.
 */
const storeToken = token => {
  try {
    fs.mkdirSync(TOKEN_DIR);
  } catch (err) {
    if (err.code !== `EEXIST`) {
      throw err;
    }
  }
  fs.writeFile(TOKEN_PATH, JSON.stringify(token));
  console.log(`Token stored to ${  TOKEN_PATH}`);
};

const getThumbnailPromised = (auth, presentationId, pageObjectId) => {
  return new Promise((resolve, reject) => {
    const slides = google.slides(`v1`);
    slides.presentations.pages.getThumbnail({
      auth: auth,
      presentationId: presentationId,
      pageObjectId: pageObjectId,
      'thumbnailProperties.mimeType': `PNG`,
      'thumbnailProperties.thumbnailSize': `LARGE`
    }, (err, thumbnail) => {
      if (err) {
        return reject(err);
      }
      resolve(thumbnail);
    });
  });
};

const downloadFilePromised = (fileUrl, filePath) => {
  return new Promise(resolve => {
    const fs = require(`fs`);
    const url = require(`url`);
    const file = fs.createWriteStream(filePath);
    const fileUrlParsed = url.parse(fileUrl);
    const httpLib = (fileUrlParsed.protocol === `https:`) ? require(`https`) : require(`http`);
    httpLib.get({
      host: fileUrlParsed.host,
      path: fileUrlParsed.path,
      headers: {
        'User-Agent': `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/54.0.2840.71 Safari/537.36`
      }
    }, response => {
      response.pipe(file);
      response.on(`end`, () => resolve(filePath));
    });
  });
};

const downloadSlides = auth => {
  const slides = google.slides(`v1`);
  slides.presentations.get({
    auth: auth,
    presentationId: argv.id
  }, function(err, presentation) {
    if (err) {
      console.log(`The API returned an error: ${  err}`);
      return;
    }
    const length = presentation.slides.length;
    console.log(`The presentation contains %s slides:`, length);

    let downloadQueue = Promise.resolve();
    presentation.slides.forEach((slide, index) => {
      const fileName = `slide-${padStart(index, 4, `0`)}.png`;
      downloadQueue = downloadQueue
        .then(() => console.log(`downloading ${fileName}`))
        .then(() => getThumbnailPromised(auth, argv.id, slide.objectId))
        .then(thumbnail => thumbnail.contentUrl)
        .then(url => downloadFilePromised(url, `${SLIDES_PATH}${fileName}`));
    });
    downloadQueue = downloadQueue.then(() => console.log(`all done`));
  });
};
