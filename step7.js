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
		//the intents will store our results from earlier and the parameters will store individual information (set in step6)
		global.user_status[resp._value.members[i].id] = { intents: {}, parameters: {} };
		
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
	
	var request = ai.textRequest(data.text,{sessionId: data.user});
	
	//when the request is responded to (from api.ai) act on it
	request.on('response', function(response) {
		
		//default "r" if there is no response... also we can customize it if we wanted in the switch/case
		var r = { 
			text: 'I didn\'t quite follow that, could you try again?', 
			params:bot_params.slack_params.default_params
		};
		
		//store the current result so we can reference it later if we want to reference what was said or other information
		global.user_status[data.user]['intents'][response.result.metadata.intentName] = response.result;
		
		//store all the "action" parameters so we can reference them later as well
		for(var i in response.result.parameters) {
			global.user_status[data.user]['parameters'][i] = response.result.parameters[i];
		}
		
		//check to see if we have an intent we're working with
		switch(response.result.metadata.intentName) {
			
			//at the beginning of a meme clear the user status
			case 'start_meme':		
				global.user_status[data.user] = { intents: {}, parameters: {} };
				global.user_status[data.user]['intents'][response.result.metadata.intentName] = response.result;
				break;
			
			
			//if we hit the bottom line, lets create the meme
			case 'meme_bottom_line':
				generateMeme(
					data.channel,
					global.user_status[data.user]
				);
				break;
				
		}
		
		//now respond
		r = { 
			text: response.result.fulfillment.speech, 
			params: bot_params.slack_params.default_params
		};
		
		global.respond(
			data.channel,
			r.text,
			r.params
		);	
		
	});
	
	 
	request.on('error', function(error) {
		console.log(error);
	});	
	
	request.end();
	
});

//the respond function will take a channel, message and params and respond to the correct channel
global.respond = function(channel,message,params) {
	
	/*
	this is why we stored the channels earlier, bot must postMessageToChannel or postMessageToGroup,
	the if statement will check to see if its a channel and post and same with the group
	*/
	
	// params can be expanded on and more info can be learned here: https://api.slack.com/docs/message-attachments 
	if(typeof(channels[channel])!='undefined') {
		bot.postMessageToChannel(channels[channel], message, params);	
	} else if(typeof(groups[channel]!='undefined')) {
		bot.postMessageToGroup(groups[channel], message, params);	
	}
}

function generateMeme(channel,status) {
	
	
	//this happens when you restart the app and it reads old slack messages sometimes.
	if(typeof(status['intents']['meme_start'])=='undefined') {
		return;	
	}
	
	//multiple ways to get the meme now, catch for both.
	var meme_type = status['parameters']['meme_type'];
	var meme_top_line = status['parameters']['meme_top_line'];
	var meme_bottom_line = status['parameters']['meme_bottom_line'];
	var url = "https://api.imgflip.com/caption_image"
	
	/*
	username: johnharden0
	password: password1234!
	*/
	
	console.log(url);
	//post to the memegenerator website and get the content
	url = 'https://api.imgflip.com/caption_image';
	body = 
		'template_id='+meme_type+
		'&username='+variables.meme_generator.username+
		'&password='+variables.meme_generator.password+
		'&text0='+meme_top_line+
		'&text1='+meme_bottom_line+
		'max_font_size=100'
	
	
	request.post({
		headers: {'content-type' : 'application/x-www-form-urlencoded'},
		url:     url,
		body:    body,
	}, function(error, response, body){
		var r = JSON.parse(body);
		console.log(r);
		var params = {
			icon_emoji: bot_params.slack_params.default_params.icon_emoji,
			attachments: [
				{
					title: 'Your meme sir.',
					image_url: r.data.url,
					"footer": ": Meme Bot",
					"footer_icon": "https://platform.slack-edge.com/img/default_application_icon.png",
					ts: Date.now()/1000,
					color: '#36a64f',
				}
			]
		};


		global.respond(channel,'',params);
	});


	
	
	/*
	Freaking Meme Generator is down, creating an alternative
	var url = "http://version1.api.memegenerator.net/Instance_Create?username="+variables.meme_generator.username+"&password="+variables.meme_generator.password+"&languageCode=en&generatorID="+meme_type+"&text0="+meme_top_line+"&text1="+meme_bottom_line;
	request.post(
		url,
		function (error, response, body) {
			//error checking and verify we get a 200 OK
			if (!error && response.statusCode == 200) {
				
				//parse the JSON response into an object
				var r = JSON.parse(body);
				
				console.log(r);

				
				//set the params for the response; more examples of what you can do with attachments can be found here: https://api.slack.com/docs/message-attachments
				var params = {
					icon_emoji: bot_params.slack_params.default_params.icon_emoji,
					attachments: [
						{
							title: 'Your meme sir.',
							image_url: r.result.instanceImageUrl,
							"footer": ": Meme Bot",
							"footer_icon": "https://platform.slack-edge.com/img/default_application_icon.png",
							ts: Date.now()/1000,
							color: '#36a64f',
						}
					]
				};
				
				
				global.respond(channel,'',params);
			}
		}
	);
	*/
}
