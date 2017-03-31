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
      count: 10,
    },
  };
};

function user(name) {
  return {
    resource: 'statuses/user_timeline',
    data: {
      screen_name: name,
      tweet_mode: 'extended',
      count: 10,
    }
  };
}

var presets = {
  list,
  user
};

function isSigned(query, sign) {
  const hmac = crypto.createHmac('sha1', process.env.SIGN_SECRET);
  hmac.setEncoding('hex');
  hmac.write(query);
  hmac.end();
  const hash = hmac.read();

  return hash === sign;
}

function res(statusCode, response) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept',
    },
    body: JSON.stringify(response)
  };
}

export default function (event, context, callback) {
  const q = event.queryStringParameters.q.split('/');
  const preset = q[0];
  if (!presets.hasOwnProperty(preset)) {
      callback(null, res(500, { error: 'unknown preset' }));
      return;
    }
  if (!isSigned(event.queryStringParameters.q, event.queryStringParameters.s)) {
      callback(null, res(500, { error: 'incorrect signature' }));
      return;
  }
  const request = presets[preset](...q[1].split(','));
  console.log(request);
  client.get(request.resource, request.data, function(error, tweets) {
    if (error) {
      callback(null, res(500, { error: 'twitter api error' }));
    } else {
      callback(null, res(200, tweets));
    }
  });
};
