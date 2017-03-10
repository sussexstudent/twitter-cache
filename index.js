var Twitter = require('twitter');
var crypto = require('crypto');

var client = new Twitter({
  consumer_key: process.env.TWITTER_KEY,
  consumer_secret: process.env.TWITTER_SECRET,
  bearer_token: process.env.TWITTER_BEARER
});

function list(owner, name) {
  return {
    resource: 'lists/statuses',
    data: {
      slug: name,
      owner_screen_name: owner,
      tweet_mode: 'extended',
      count: 6,
    },
  };
};

var presets = {
  list
};

function isSigned(query, sign) {
  const hmac = crypto.createHmac('sha1', process.env.SIGN_SECRET);
  hmac.setEncoding('hex');
  hmac.write(query);
  hmac.end();
  const hash = hmac.read();

  return hash === sign;
}

export default function (event, context, callback) {
  const q = event.queryStringParameters.q.split('.');
  const preset = q[0];
  if (!presets.hasOwnProperty(preset)) {
      callback(null, {
        statusCode: 500,
        headers: {},
        body: 'Preset does not exist!'
      });
      return;
    }
  if (!isSigned(event.queryStringParameters.q, event.queryStringParameters.s)) {
      callback(null, {
        statusCode: 500,
        headers: {},
        body: 'Not signed!'
      });
      return;
  }
  const request = presets[preset](...q[1].split('/'));
  console.log(request);
  client.get(request.resource, request.data, function(error, tweets) {
    if (error) {
      callback(null, {
        statusCode: 500,
        headers: {},
        body: 'An error!'
      });
    } else {
      callback(null, {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept',
        },
        body: JSON.stringify(tweets)
      });
    }
  });
};
