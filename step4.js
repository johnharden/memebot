/*
deps for the project:
slackbots - the slackbots node API that interacts and simplifies a ton of API webhook calls for us
request   - will use request to do an actual post for us in node to create the meme later
apiai     - apiai node integration that will make our effort to hook into API.ai a million times easier
*/

var request = require('request');
var SlackBot = require('slackbots'); //slackbot npm
var apiai = require('apiai'); //api npm

//variables for the code (hidden special keys for api.ai/meme generator/slack bot
var variables = require('./variables'); 

//we'll use global as a "temporary" database for the effort of this app
global.user_status = new Array();

//we need to initiate the ai integration w/ api.ai, this will allow us to do requests with the platform
var ai = apiai(variables.api_ai_key);

var bot_params = {
    token: variables.slack_bot_key, // Add a bot https://my.slack.com/services/new/bot and put the token  
    name: 'Meme Bot',
	slack_params: {
		
		//default slack parameters, can find more at https://api.slack.com/docs/message-attachments
		default_params: {
			icon_emoji: ':octopus:',
		},
		
		//need the realname of the bot so we can store some info about the bot.
		slack_realname: 'memebot',
		bot_data: {},
		
	}
};

// create a bot 
var bot = new SlackBot(bot_params);

var channels = {};
var groups = {};

bot.on('start', function() {
	
	/*
	there is a distinct difference in the slack system between channels and groups:
	
	bot.getChannels() - get public channels that are accessible to anyone
	bot.getGroups()   - get locked channels that are invite only in the system
	
	we need to store the ids/names of the channels/groups because when the bot returns messages it returns ids
	
	bot.getUsers()    - this will get all users/bots/integrations in the system

	*/
	
	resp = bot.getChannels();
	for(var i in resp._value.channels) {
		//we're going to create an associative array of the channels so we can reference them later
		channels[resp._value.channels[i].id] = resp._value.channels[i].name;
	}
	
	
	resp = bot.getGroups();
	for(var i in resp._value.channels) {
		//we're going to create an associative array of the groups so we can reference them later
		channels[resp._value.channels[i].id] = resp._value.channels[i].name;
	}
	
	resp = bot.getUsers();
	for(var i in resp._value.members) {
		//we're going to store the global user statuses of every user so we can maintain a temporary session
		global.user_status[resp._value.members[i].id] = { started: false };
		
		//if we match the name of the slack bot, store the bot data, we'll need it later
		if(resp._value.members[i].name==bot_params.slack_params.slack_realname)
			bot_params.slack_params.bot_data = resp._value.members[i];
	}
	
	//if we dont have the bot then lets error out
	if(Object.keys(bot_params.slack_params.bot_data).length==0) {
		console.error('We could not find the bot! We need to know who the bot is to stop infinite loops, check your slack_realname configuration.');
		process.exit();	
	} else {
		console.log(	bot_params.slack_params.bot_data);
	}
	
	/*
	
	at this point in the code we actually have a stored list of all the groups, channels and users,
	we'll need to reference each of these objects later in the code for different purposes
	
	*/
	
});

bot.on('message', function(data) {
	

	//if the content was posted by our bot, ignore it to stop infinite loops :)	
	if(data.username==bot_params.slack_params.bot_data.name)
		return;
		
	//make sure it was a message notifcation and not a presence notification, etc
	if(data.type!='message')
		return;
	
	if(typeof(data.user)!='string' || data.user=='')
		return;

	
	/*
	initiate the text request to api.ai to see what the response is going to be.
	we use the sessionId as the data.user (which is the slack ID), so that multiple
	people can be creating memes in the same channel at once.
	*/
	
	var request = ai.textRequest(data.text,{sessionId: data.user});
	
	//when the request is responded to (from api.ai) act on it
	request.on('response', function(response) {
		
		console.log(response);
		var response_speech = response.result.fulfillment.speech;
		console.log(response_speech);
		
		
		//task 6: we need to build a function using slackbots npm to respond in the correct channel
		//task 7: use function to take response_speech and send it back to the user
		
	});
	
	 
	request.on('error', function(error) {
		console.log(error);
	});	
	
	request.end();
	
});
