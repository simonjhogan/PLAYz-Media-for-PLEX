/*
** PLEX for LG Media Center
** Created by Simon J. Hogan
** Copyright 2013 h3consulting
** http://plex.h3consulting.net
**/

function Player() {		
	this.PLEX_OPTIONS_PREFIX = "plexOptions-";	
	
	this.directPlay = (localStorage.getItem(this.PLEX_OPTIONS_PREFIX + "enableTranscoding") == "1") ? false : true;
	
	this.position = 0;
	this.speed = 1;
	this.controlTimer = null;
	this.scanStep = 300000;
	this.scanStepRation = 30;	
	this.resume = false;
	
	this.debug = localStorage.getItem(this.PLEX_OPTIONS_PREFIX + "debug") == "1" ? true : false;
};

Player.prototype.initialise = function()
{
	var self = this;
	this.plex = new PLEX();
	this.key = $.querystring().key;
	this.media = document.getElementById("player");		

	//Direct play via standalone player
	if (self.directPlay) {
		if (localStorage.getItem(this.PLEX_OPTIONS_PREFIX + "standalonePlayer") == "1") {
			this.openMedia(this.key);
		}
	}	
	
	// Enable page loading icon
	if (window.NetCastSetPageLoadingIcon) {
	    window.NetCastSetPageLoadingIcon('enabled');
	}

	if (localStorage.getItem(this.PLEX_OPTIONS_PREFIX + "largeText") == "1") {
		$("body").addClass("xlarge");
	}
	
	if (this.debug) {
		var device = document.getElementById("device");
		
		var html = "<table>";
		html += "<tr><th>Platform</th><td>" + device.platform + "</td></tr>";
		html += "<tr><th>Chipset</th><td>" + device.chipset + "</td></tr>";
		html += "<tr><th>HW Version</th><td>" + device.hwVersion + "</td></tr>";
		html += "<tr><th>SW Version</th><td>" + device.hwVersion + "</td></tr>";		
		html += "<tr><th>SDK Version</th><td>" + device.SDKVersion + "</td></tr>";
		html += "<tr><th>IP</td><th>" + device.net_ipAddress + "</td></tr>";		
		
		if (window.NetCastGetUsedMemorySize) {
			html += "<tr><th>Used Memory</th><td id=\"debugMemory\">" + window.NetCastGetUsedMemorySize() + "</td></tr>";		
		}
		html += "</table>";
		$("#debug").html(html);				
		$("#debug").show();
		
	}

	
	this.media.onPlayStateChange = function(event) {
		var state = document.getElementById("player").playState;

		switch(state) {
			case 0: //Stopped
				clearInterval(self.timer);
				
				$("#message").html("<i class=\"glyphicon xlarge stop\"></i>");
				$("#message").show();
				$("#message").fadeOut(3000);
				self.plex.reportProgress(self.mediaKey, "stopped", self.media.playPosition);			
				break;
				
			case 1: //Playing
				if (self.resume) {
					var t = setTimeout(function() {
						self.seek(self.viewOffset);
						self.hideLoader();
					}, 3000);
					
					self.resume = false;
				}
				$("#message").html("<i class=\"glyphicon xlarge play\"></i><br/>" + $(self.cache).find("Video:first").attr("title"));
				$("#message").show();
				$("#message").fadeOut(5000);	
				break;
				
			case 2: //Paused
				clearInterval(self.timer);
				
				$("#message").html("<i class=\"glyphicon xlarge pause\"></i>");
				$("#message").show();
				this.plex.reportProgress(self.mediaKey, "paused", self.media.playPosition);			
				break;
				
			case 3: //Connecting
				$("#message").html("Connecting");
				$("#message").show();
				$("#message").fadeOut(5000);
				break;
				
			case 4: //Buffering			
				break;
				
			case 5: //Finished
				clearInterval(self.timer);
				self.setWatchedStatus(self.mediaKey, self.media.playTime, self.media.playPosition);

				$("#message").html("Finished");
				$("#message").show();
				$("#message").fadeOut(3000);
				$("#progressTime").text("");
				
				switch ($(self.cache).find("Video:first").attr("type")) {
					case "episode":	
						if (localStorage.getItem(self.PLEX_OPTIONS_PREFIX + "nextEpisode") == "1") {
							history.back(1);
						}
						
						var parentKey = $(self.cache).find("Video:first").attr("parentKey");
						var mediaIndex = $(self.cache).find("Video:first").attr("index");
						
						self.plex.getMediaMetadata(parentKey + "/children", function(xml) {
							var nextKey = $(xml).find("Video[index='" + (Number(mediaIndex)+1) + "']:first").attr("key");						
							if (nextKey) {
								self.openMedia(nextKey);
							} else {
								history.back(1);	
							}
						});
						break;						
					default:
						history.back(1);
						break;
				}
				break;
				
			case 6: //Error
				clearInterval(self.timer);
				var error = document.getElementById("player").error;				
				$("#message").html("Error: " + error);
				$("#message").show();
				$("#message").fadeOut(3000);			
				break;
				
		}	
	};
	
	this.media.onError = function() {
		var error = document.getElementById("player").error;
		$("#message").text("Error: " + error);
		$("#message").show();	
	};
	
	this.progessbar = $("#progressbar-container").progressbar({width: "600px", height: "8px"});

	$("#controls a, .options a").tooltipster();
	
	$(document).keydown(function(event) {
		if (event.which == 461 || event.which == 27) {
			event.preventDefault();
			history.back(1);
			return;
		}	

		if (event.which == 38) { //Up
			self.showControls();
			return;
		}
		
		if (event.which == 40) { //Down
			self.hideControls();
			return;
		}
		
		self.showControls();
	});	
	
	$("a").keydown(function() {
		var current = $(this).data("keyIndex");
		var right = Number(current) + 1;
		var left = Number(current) - 1;
		
		// Left Arrow
		if (event.which == 37) {
			event.preventDefault();
			if ($("a[data-key-index='" + left + "']").is(":visible")) {
				$("a[data-key-index='" + left + "']").focus();
			} else {
				$("a[data-key-index='" + (left - 1) + "']").focus();
			}
		}
		
		// Right Arrow
		if (event.which == 39) {
			event.preventDefault();
			if ($("a[data-key-index='" + right + "']").is(":visible")) {
				$("a[data-key-index='" + right + "']").focus();
			} else {
				$("a[data-key-index='" + (right + 1) + "']").focus();
			}
		}
	});
	
	$("#controls a, .options a").hover(function(event) {
		$(this).focus();
	});

	$("#controls a, .options a").focus(function(event) {
		$("#controls a, .options a").removeClass("selected");
		$(this).addClass("selected");
	});

	$(document).mousemove(function(event) {
		self.showControls();
	});
	
	$("#back").click(function(event) {
		event.stopPropagation();
		event.preventDefault();
		history.back(1);
	});

	this.initControls();
	this.showControls();
	this.openMedia(this.key);
};

Player.prototype.openMedia = function(key)
{
	var self = this;
	this.key = key;
	this.showLoader("Loading");
	
	this.plex.getMediaMetadata(this.key, function(xml) {
		self.cache = xml;
		self.mediaKey = $(xml).find("Video:first").attr("ratingKey"); 
		self.mediaUrl = $(xml).find("Part:first").attr("key");
		self.viewOffset = $(xml).find("Video:first").attr("viewOffset");
		self.duration = $(xml).find("Video:first").attr("duration"); 
		
		//To Do: Check for multiple media streams
		if (self.directPlay) {
			//Direct play
			
			//Standalone player
			if (localStorage.getItem(self.PLEX_OPTIONS_PREFIX + "standalonePlayer") == "1") {
				window.location.replace(self.plex.getServerUrl() + self.mediaUrl);
				return;
			}			
			
			//Integrated player
			self.media.data = self.plex.getServerUrl() + self.mediaUrl;
			if ($(xml).find("Stream[streamType='2']").length <= 1) {
				$("#language").hide();		
			} else {
				$("#language").show();
			}
			
			if ($(xml).find("Stream[streamType='3']").length == 0) {
				$("#subtitles").hide();
			} else {
				$("#subtitles").show();	
			}
		} else {
			//Transcode HLS - Chrome/Web profile
			self.media.data = self.plex.getHlsTranscodeUrl(self.key);			
		}
		self.hideLoader();
		
		if ($.querystring().autoplay == "true") {
			if (self.viewOffset) {
				self.resumeDialog(Number(self.viewOffset));
			} else {
				$("#play").focus();
				self.speed = 1;
				self.play(self.speed);
				self.disableSubtitles();
				//self.setDefaultStreams(); 
			}
		} else {
			$("#play").focus();
		}		
	});
};

Player.prototype.resumeDialog = function(ms)
{
	var self = this;
	var time = this.plex.getTimeFromMS(ms);
	var html = "<a data-key-index=\"100\" id=\"resume\" href=\"\"><span class=\"option\">Resume from " + time + "</span></a>";
	html += "<a data-key-index=\"101\" id=\"start\" href=\"\"><span class=\"option\">Start from beginning</span></a>";
	$("#dialog .content").html(html);

	$("#dialog a").off();
	
	$("#dialog a").hover(function() {
		$(this).focus();
	});
	
	$("#resume").click(function() {
		event.preventDefault();
		
		if (self.directPlay) {
			self.seek(ms);
		} else {
			self.showLoader("Seeking");
			self.resume = true;
			//self.plex.getTimeline(self.mediaKey, "playing", ms, self.duration);
		}
		
		self.speed = 1;
		self.play(self.speed);			
		self.setDefaultStreams(); 
		$("#dialog").hide();
		$("#play").focus();
	});

	$("#start").click(function() {
		event.preventDefault();
		self.speed = 1;
		self.play(self.speed);
		self.setDefaultStreams(); 		
		$("#dialog").hide();
		$("#play").focus();
	});
	
	$("#dialog a").keydown(function() {
		var current = $(this).data("keyIndex");
		var down = Number(current) + 1;
		var up = Number(current) - 1;
		
		// Up Arrow
		if (event.which == 38) {
			event.stopPropagation();
			event.preventDefault();
			$("a[data-key-index='" + up + "']").focus();
		}
		
		// Down Arrow
		if (event.which == 40) {
			event.stopPropagation();
			event.preventDefault();
			$("a[data-key-index='" + down + "']").focus();
		}			
	});
	
	$("#dialog").show();
	$("#dialog a:first").focus();
};

Player.prototype.setDefaultStreams = function()
{
	/* var defaultSubtitles = $(this.cache).find("Media:first Part:first Stream[streamType='3'][selected='1']");	
	if (defaultSubtitles.length > 0) {
		this.enableSubtitles($(defaultSubtitles).attr("key"));
	
	
	var defaultLanguage = $(this.cache).find("Media:first Part:first Stream[streamType='2'][selected='1']");	
	if (defaultLanguage.length > 0) {
		if ($(defaultLanguage).attr("languageCode")) {
			this.setAudoLanguage($(defaultLanguage).attr("languageCode"), $(defaultLanguage).attr("language"));
		}
	}*/
};

Player.prototype.subtitleDialog = function()
{
	var self = this;
	var html = "";
	var i = 0;
	var partKey = $(this.cache).find("Media:first Part:first").attr("id");
		
	$(this.cache).find("Media:first Stream[streamType='3']").each(function(index, value){
		i = index;
		html += "<a data-key-index=\"" + (200 + index) + "\" href=\"\" data-part-key=\"" + partKey + "\" data-stream-key=\"" + $(this).attr("id") + "\" data-key=\"" + $(this).attr("key") + "\"><span class=\"option\">" + $(this).attr("language") + " (" + $(this).attr("format") +") Subtitles</span></a>";
	});
	html += "<a data-key-index=\"" + (200 + i+1) + "\" href=\"\" data-part-key=\"" + partKey + "\" data-stream-key=\"" + $(this).attr("id") + "\" data-key=\"disabled\"><span class=\"option\">Disable Subtitles</span></a>";		
	html += "<a data-key-index=\"" + (200 + i+2) + "\" href=\"\" data-key=\"close\"><span class=\"option\">Close</span></a>";		

	$("#dialog .content").html(html);
	
	//$("#dialog a").off();
	
	$("#dialog a").hover(function() {
		$(this).focus();
	});
	
	$("#dialog a").click(function(event) {
		event.preventDefault();
		switch ($(this).data("key")) {
			case "disabled":
				self.plex.setSubtitleStream($(this).data("partKey"));
				self.disableSubtitles();
				break;
			
			case "close":
				// Do nothing
				break;
				
			default:
				self.plex.setSubtitleStream($(this).data("partKey"), $(this).data("streamKey"));
				self.enableSubtitles($(this).data("key"));
				break;
		}
		
		$("#dialog").hide();
		$("#subtitles").focus();
	});

	
	$("#dialog a").keydown(function(event) {
		var current = $(this).data("keyIndex");
		var down = Number(current) + 1;
		var up = Number(current) - 1;
		
		// Up Arrow
		if (event.which == 38) {
			event.stopPropagation();
			event.preventDefault();
			$("a[data-key-index='" + up + "']").focus();
		}
		
		// Down Arrow
		if (event.which == 40) {
			event.stopPropagation();
			event.preventDefault();
			$("a[data-key-index='" + down + "']").focus();
		}
		
		if (event.which == 461) {
			event.stopPropagation();
			$("#dialog").hide();
			$("#subtitles").focus();	
		}	
	});
	
	$("#dialog").show();
	$("#dialog a:first").focus();
};

Player.prototype.languageDialog = function()
{
	var self = this;
	var html = "";
	var i = 0;
	var partKey = $(this.cache).find("Media:first Part:first").attr("id");
	
	$(this.cache).find("Media:first Stream[streamType='2']").each(function(index, value){
		i = index;
		html += "<a data-key-index=\"" + (200 + index) + "\" href=\"\" data-part-key=\"" + partKey + "\" data-stream-key=\"" + $(this).attr("id") + "\" data-language-code=\"" + $(this).attr("languageCode") + "\" data-label=\"" + $(this).attr("language") + "\"><span class=\"option\">" + $(this).attr("language") + " (" + $(this).attr("codec") + ") Audio</span></a>";
	});
	html += "<a data-key-index=\"" + (200 + i+1) + "\" href=\"\" data-part-key=\"" + partKey + "\" data-stream-key=\"" + $(this).attr("id") + "\" data-language-code=\"close\"><span class=\"option\">Close</span></a>";		
	$("#dialog .content").html(html);
	$("#dialog a").off();
	
	$("#dialog a").hover(function() {
		$(this).focus();
	});
	
	$("#dialog a").click(function(event) {
		event.preventDefault();
		
		if ($(this).data("languageCode") != "close") {
			self.plex.setAudioStream($(this).data("partKey"), $(this).data("streamKey"));
			self.setAudoLanguage($(this).data("languageCode"), $(this).data("label"));
		}
		$("#dialog").hide();
		$("#language").focus();
	});

	
	$("#dialog a").keydown(function(event) {
		var current = $(this).data("keyIndex");
		var down = Number(current) + 1;
		var up = Number(current) - 1;
		
		// Up Arrow
		if (event.which == 38) {
			event.stopPropagation();
			event.preventDefault();
			$("a[data-key-index='" + up + "']").focus();
		}
		
		// Down Arrow
		if (event.which == 40) {
			event.stopPropagation();
			event.preventDefault();
			$("a[data-key-index='" + down + "']").focus();
		}

		if (event.which == 461) {
			event.stopPropagation();
			$("#dialog").hide();
			$("#language").focus();	
		}
	});
	
	$("#dialog").show();
	$("#dialog a:first").focus();
};

Player.prototype.initControls = function()
{
	var self = this;
	
	$(document).keydown(function(event) {		
		if (event.which == 461) { //Back
			event.preventDefault();
			history.back(1);
			return;
		}

		if (event.which == 19) { //Pause
			self.pause();
			return;
		}
		
		if (event.which == 413) { //Stop
			self.stop();
			return;
		}		
		
		if (event.which == 412) { //Rewind
			self.rewind();
			return;
		}
		
		if (event.which == 415) { //Play
			self.speed = 1;
			self.play(self.speed);
			return;
		}
		
		if (event.which == 417) { //Forward
			self.forward();
			return;
		}
		
		if (event.which == 0 || event.which == 457) { //Info
			self.infoBox();
			return;
		}		

		if (event.which == 405) { //QMENU
		    if(window.NetCastLaunchQMENU) {
		        window.NetCastLaunchQMENU();
		    }			
			return;
		}	
		
		if (event.which == 406) { //Ratio
		    if(window.NetCastLaunchRATIO) {
		        window.NetCastLaunchRATIO();
		    }			
			return;
		}	
		
		self.showControls();
	});	
	
	$("#play").click(function(event) {
		event.stopPropagation();
		event.preventDefault();
		self.speed = 1;
		self.play(self.speed);
		self.timerControls();
	});
	
	$("#pause").click(function(event) {
		event.stopPropagation();
		event.preventDefault();
		self.pause();
		self.timerControls();
	});

	$("#stop").click(function(event) {
		event.stopPropagation();
		event.preventDefault();
		self.stop();
		self.timerControls();
	});
	
	$("#skipBackward").click(function(event) {
		event.stopPropagation();
		event.preventDefault();	
		self.rewind();	
		self.timerControls();
	});

	$("#skipForward").click(function(event) {
		event.stopPropagation();
		event.preventDefault();
		self.forward();	
		self.timerControls();
	});

	$("#qmenu").click(function(event) {
		event.stopPropagation();
		event.preventDefault();
	    if(window.NetCastLaunchQMENU) {
	        window.NetCastLaunchQMENU();
	    }			
		self.timerControls();
	});
	
	$("#ratio").click(function(event) {
		event.stopPropagation();
		event.preventDefault();
	    if(window.NetCastLaunchRATIO) {
	        window.NetCastLaunchRATIO();
	    }			
		self.timerControls();
	});	
	

	$("#subtitles").click(function(event) {
		event.stopPropagation();
		event.preventDefault();
		self.subtitleDialog();
		self.timerControls();	
	});

	$("#language").click(function(event) {
		event.stopPropagation();
		event.preventDefault();
		self.languageDialog();
		self.timerControls();	
	});

	/*$("#transcode").click(function(event) {
		event.stopPropagation();
		event.preventDefault();
		self.media.data = self.plex.getHlsTranscodeUrl(self.key);
		self.play(1);
		self.timerControls();	
	});*/	
	
	$("#info").off("click");
	$("#info").click(function(event) {
		event.stopPropagation();
		event.preventDefault();
		self.infoBox();
		self.timerControls();		
	});
	
	$(document).on("progressClick", function(event) {
		var ms = Math.round(event.percent/100 * self.media.playTime);
		self.seek(ms);
		$("a.selected").focus();
		self.timerControls();
	});	
};

Player.prototype.infoBox = function()
{
	var self = this;
	var metadata = $(this.cache).find("Video:first");
	
	if ($("#infoBox").is(":visible")) {
		$("#infoBox").hide();
	} else {
		var roles = [];
		$(metadata).find("Role").each(function() { roles.push($(this).attr("tag")); });

		var genre = [];
		$(metadata).find("Genre").each(function() { genre.push($(this).attr("tag")); });
		
		$("#infoBox .content").html(self.plex.getMediaHtml(metadata.attr("title"), metadata.attr("type"), 
				{"art": metadata.attr("art"),
				"grandparentTitle": metadata.attr("grandparentTitle"),
				"tagline": metadata.attr("tagline"),
				"summary": metadata.attr("summary"),
				"year": metadata.attr("year"),
				"rating": metadata.attr("rating"),
				"director": $(metadata).find("Director:first").attr("tag"),
				"width": $(metadata).find("Media:first").attr("width"),
				"height": $(metadata).find("Media:first").attr("height"),				
				"roles": roles,
				"genre": genre,
				"index": metadata.attr("index"),
				"parentIndex": metadata.attr("parentIndex"),				
				"duration": metadata.attr("duration")															
			}));		
		$("#infoBox").show().delay(5000).fadeOut(3000);
	}
};

Player.prototype.play = function(speed)
{
	var self = this;
	this.progressCount = 30;
	
	//$("#pause").focus();	
	this.media.play(speed);
	this.timerControls();	
	
	clearInterval(this.timer);
	this.timer = setInterval(function() {
		if ($("#controls").is(":visible")) {
			var pos = (self.media.playPosition/self.media.playTime)*100; 
			self.progessbar.progress(pos);
			if (self.media.playPosition) {
				$("#progressTime").text(self.plex.getTimeFromMS(self.media.playPosition) + "/" + self.plex.getTimeFromMS(self.media.playTime));
			}
		}
		
		if (self.debug) {
			if (window.NetCastGetUsedMemorySize) {
				$("#debugMemory").text(window.NetCastGetUsedMemorySize());		
			}
		}
		
		self.progressCount++;
		
		if (self.progressCount >= 30) {
			self.setWatchedStatus(self.mediaKey, self.media.playTime, self.media.playPosition);
			self.plex.reportProgress(self.mediaKey, "playing", self.media.playPosition);
			self.progressCount = 0;
		}
		
	}, 1000);
};

Player.prototype.rewind = function()
{
	var pos = Number(this.media.playPosition);
	var total = Number(this.media.playTime);
	this.scanStep = Math.round(total/this.scanStepRation);
	
	pos = (pos - this.scanStep) > 0 ? pos - this.scanStep : 0;
	this.media.seek(pos);
	
	$("#message").html("<i class=\"glyphicon xlarge rewind\"></i>");
	$("#message").show();
	$("#message").fadeOut(3000);	
};

Player.prototype.forward = function()
{
	var pos = Number(this.media.playPosition);
	var total = Number(this.media.playTime);
	this.scanStep = Math.round(total/this.scanStepRation);
	
	pos = (pos + this.scanStep) < total ? pos + this.scanStep : total - 1000;
	this.media.seek(pos);
	
	$("#message").html("<i class=\"glyphicon xlarge forward\"></i>");
	$("#message").show();
	$("#message").fadeOut(3000);	
};

Player.prototype.pause = function()
{
	//$("#play").focus();
	clearInterval(this.timer);
	this.media.play(0);
};

Player.prototype.stop = function()
{
	//$("#play").focus();
	clearInterval(this.timer);	
	this.media.stop();	
};

Player.prototype.seek = function(timeMS)
{
	this.media.seek(timeMS);
};

Player.prototype.enableSubtitles = function(key)
{	
	if (key != "undefined") {
		this.media.subtitle = this.plex.getServerUrl() + key;
		this.media.subtitleOn = true;
		$("#message").html("Subtitles On");
		$("#message").show();
		$("#message").fadeOut(3000);	
	} else {
		this.media.subtitleOn = true;
		$("#message").html("Integrated Subtitles Not Supported!");
		$("#message").show();
		$("#message").fadeOut(3000);		
	}
};

Player.prototype.disableSubtitles = function()
{
	this.media.subtitleOn = false;
	this.media.subtitle = "";
	$("#message").html("Subtitles Off");
	$("#message").show();
	$("#message").fadeOut(3000);	
};

Player.prototype.setAudoLanguage = function(key, label)
{
	var code = this.getLanguageCode(key);
	
	if (code.length > 0) {
		this.media.audioLanguage = code;
		$("#message").html("Audio: " + label + " (" + code + ")");
		$("#message").show();
		$("#message").fadeOut(3000);
	}
};

Player.prototype.toggleControls = function()
{
	if ($("#controls").is(':visible')) {
		this.hideControls();
	} else {
		this.showControls();
	}
};

Player.prototype.showControls = function()
{
	$("#controls").show();
	$(".options").show();
	this.timerControls();
};

Player.prototype.hideControls = function()
{
	$("#controls").fadeOut();
	$(".options").fadeOut();
};

Player.prototype.timerControls = function() {
	var self = this;
	
	clearInterval(this.controlTimer);
	this.controlTimer = setInterval(function() {
		self.hideControls();
		clearInterval(self.controlTimer);
	}, 8000);	
};

Player.prototype.getLanguageCode = function(code) 
{ 
        if (code == 'abk') { return 'ab'; }; 
        if (code == 'aar') { return 'aa'; }; 
        if (code == 'afr') { return 'af'; }; 
        if (code == 'alb' || code == 'sqi') { return 'sq'; }; 
        if (code == 'amh') { return 'am'; }; 
        if (code == 'ara') { return 'ar'; }; 
        if (code == 'arg') { return 'an'; }; 
        if (code == 'arm' || code == 'hye') { return 'hy'; }; 
        if (code == 'asm') { return 'as'; }; 
        if (code == 'ave') { return 'ae'; }; 
        if (code == 'aym') { return 'ay'; }; 
        if (code == 'aze') { return 'az'; }; 
        if (code == 'bak') { return 'ba'; }; 
        if (code == 'baq' || code == 'eus') { return 'eu'; }; 
        if (code == 'bel') { return 'be'; }; 
        if (code == 'ben') { return 'bn'; }; 
        if (code == 'bih') { return 'bh'; }; 
        if (code == 'bis') { return 'bi'; }; 
        if (code == 'bos') { return 'bs'; }; 
        if (code == 'bre') { return 'br'; }; 
        if (code == 'bul') { return 'bg'; }; 
        if (code == 'bur' || code == 'mya') { return 'my'; }; 
        if (code == 'cat') { return 'ca'; }; 
        if (code == 'cha') { return 'ch'; }; 
        if (code == 'che') { return 'ce'; }; 
        if (code == 'chi' || code == 'zho') { return 'zh'; }; 
        if (code == 'chu') { return 'cu'; }; 
        if (code == 'chv') { return 'cv'; }; 
        if (code == 'cor') { return 'kw'; }; 
        if (code == 'cos') { return 'co'; }; 
        if (code == 'scr' || code == 'hrv') { return 'hr'; }; 
        if (code == 'cze' || code == 'ces') { return 'cs'; }; 
        if (code == 'dan') { return 'da'; }; 
        if (code == 'div') { return 'dv'; }; 
        if (code == 'dut' || code == 'nld') { return 'nl'; }; 
        if (code == 'dzo') { return 'dz'; }; 
        if (code == 'eng') { return 'en'; }; 
        if (code == 'epo') { return 'eo'; }; 
        if (code == 'est') { return 'et'; }; 
        if (code == 'fao') { return 'fo'; }; 
        if (code == 'fij') { return 'fj'; }; 
        if (code == 'fin') { return 'fi'; }; 
        if (code == 'fre' || code == 'fra') { return 'fr'; }; 
        if (code == 'gla') { return 'gd'; }; 
        if (code == 'glg') { return 'gl'; }; 
        if (code == 'geo' || code == 'kat') { return 'ka'; }; 
        if (code == 'ger' || code == 'deu') { return 'de'; }; 
        if (code == 'gre' || code == 'ell') { return 'el'; }; 
        if (code == 'grn') { return 'gn'; }; 
        if (code == 'guj') { return 'gu'; }; 
        if (code == 'hat') { return 'ht'; }; 
        if (code == 'hau') { return 'ha'; }; 
        if (code == 'heb') { return 'he'; }; 
        if (code == 'her') { return 'hz'; }; 
        if (code == 'hin') { return 'hi'; }; 
        if (code == 'hmo') { return 'ho'; }; 
        if (code == 'hun') { return 'hu'; }; 
        if (code == 'ice' || code == 'isl') { return 'is'; }; 
        if (code == 'ido') { return 'io'; }; 
        if (code == 'ind') { return 'id'; }; 
        if (code == 'ina') { return 'ia'; }; 
        if (code == 'ile') { return 'ie'; }; 
        if (code == 'iku') { return 'iu'; }; 
        if (code == 'ipk') { return 'ik'; }; 
        if (code == 'gle') { return 'ga'; }; 
        if (code == 'ita') { return 'it'; }; 
        if (code == 'jpn') { return 'ja'; }; 
        if (code == 'jav') { return 'jv'; }; 
        if (code == 'kal') { return 'kl'; }; 
        if (code == 'kan') { return 'kn'; }; 
        if (code == 'kas') { return 'ks'; }; 
        if (code == 'kaz') { return 'kk'; }; 
        if (code == 'khm') { return 'km'; }; 
        if (code == 'kik') { return 'ki'; }; 
        if (code == 'kin') { return 'rw'; }; 
        if (code == 'kir') { return 'ky'; }; 
        if (code == 'kom') { return 'kv'; }; 
        if (code == 'kor') { return 'ko'; }; 
        if (code == 'kua') { return 'kj'; }; 
        if (code == 'kur') { return 'ku'; }; 
        if (code == 'lao') { return 'lo'; }; 
        if (code == 'lat') { return 'la'; }; 
        if (code == 'lav') { return 'lv'; }; 
        if (code == 'lim') { return 'li'; }; 
        if (code == 'lin') { return 'ln'; }; 
        if (code == 'lit') { return 'lt'; }; 
        if (code == 'ltz') { return 'lb'; }; 
        if (code == 'mac' || code == 'mkd') { return 'mk'; }; 
        if (code == 'mlg') { return 'mg'; }; 
        if (code == 'may' || code == 'msa') { return 'ms'; }; 
        if (code == 'mal') { return 'ml'; }; 
        if (code == 'mlt') { return 'mt'; }; 
        if (code == 'glv') { return 'gv'; }; 
        if (code == 'mao' || code == 'mri') { return 'mi'; }; 
        if (code == 'mar') { return 'mr'; }; 
        if (code == 'mah') { return 'mh'; }; 
        if (code == 'mol') { return 'mo'; }; 
        if (code == 'mon') { return 'mn'; }; 
        if (code == 'nau') { return 'na'; }; 
        if (code == 'nav') { return 'nv'; }; 
        if (code == 'nde') { return 'nd'; }; 
        if (code == 'nbl') { return 'nr'; }; 
        if (code == 'ndo') { return 'ng'; }; 
        if (code == 'nep') { return 'ne'; }; 
        if (code == 'sme') { return 'se'; }; 
        if (code == 'nor') { return 'no'; }; 
        if (code == 'nob') { return 'nb'; }; 
        if (code == 'nno') { return 'nn'; }; 
        if (code == 'nya') { return 'ny'; }; 
        if (code == 'oci') { return 'oc'; }; 
        if (code == 'ori') { return 'or'; }; 
        if (code == 'orm') { return 'om'; }; 
        if (code == 'oss') { return 'os'; }; 
        if (code == 'pli') { return 'pi'; }; 
        if (code == 'pan') { return 'pa'; }; 
        if (code == 'per' || code == 'fas') { return 'fa'; }; 
        if (code == 'pol') { return 'pl'; }; 
        if (code == 'por') { return 'pt'; }; 
        if (code == 'pus') { return 'ps'; }; 
        if (code == 'que') { return 'qu'; }; 
        if (code == 'roh') { return 'rm'; }; 
        if (code == 'rum' || code == 'ron') { return 'ro'; }; 
        if (code == 'run') { return 'rn'; }; 
        if (code == 'rus') { return 'ru'; }; 
        if (code == 'smo') { return 'sm'; }; 
        if (code == 'sag') { return 'sg'; }; 
        if (code == 'san') { return 'sa'; }; 
        if (code == 'srd') { return 'sc'; }; 
        if (code == 'scc' || code == 'srp') { return 'sr'; }; 
        if (code == 'sna') { return 'sn'; }; 
        if (code == 'iii') { return 'ii'; }; 
        if (code == 'snd') { return 'sd'; }; 
        if (code == 'sin') { return 'si'; }; 
        if (code == 'slo' || code == 'slk') { return 'sk'; }; 
        if (code == 'slv') { return 'sl'; }; 
        if (code == 'som') { return 'so'; }; 
        if (code == 'sot') { return 'st'; }; 
        if (code == 'spa') { return 'es'; }; 
        if (code == 'sun') { return 'su'; }; 
        if (code == 'swa') { return 'sw'; }; 
        if (code == 'ssw') { return 'ss'; }; 
        if (code == 'swe') { return 'sv'; }; 
        if (code == 'tgl') { return 'tl'; }; 
        if (code == 'tah') { return 'ty'; }; 
        if (code == 'tgk') { return 'tg'; }; 
        if (code == 'tam') { return 'ta'; }; 
        if (code == 'tat') { return 'tt'; }; 
        if (code == 'tel') { return 'te'; }; 
        if (code == 'tha') { return 'th'; }; 
        if (code == 'tib' || code == 'bod') { return 'bo'; }; 
        if (code == 'tir') { return 'ti'; }; 
        if (code == 'ton') { return 'to'; }; 
        if (code == 'tso') { return 'ts'; }; 
        if (code == 'tsn') { return 'tn'; }; 
        if (code == 'tur') { return 'tr'; }; 
        if (code == 'tuk') { return 'tk'; }; 
        if (code == 'twi') { return 'tw'; }; 
        if (code == 'uig') { return 'ug'; }; 
        if (code == 'ukr') { return 'uk'; }; 
        if (code == 'urd') { return 'ur'; }; 
        if (code == 'uzb') { return 'uz'; }; 
        if (code == 'vie') { return 'vi'; }; 
        if (code == 'vol') { return 'vo'; }; 
        if (code == 'wln') { return 'wa'; }; 
        if (code == 'wel' || code == 'cym') { return 'cy'; }; 
        if (code == 'fry') { return 'fy'; }; 
        if (code == 'wol') { return 'wo'; }; 
        if (code == 'xho') { return 'xh'; }; 
        if (code == 'yid') { return 'yi'; }; 
        if (code == 'yor') { return 'yo'; }; 
        if (code == 'zha') { return 'za'; }; 
        if (code == 'zul') { return 'zu'; }; 
        
        return code; 
}

Player.prototype.setWatchedStatus = function(key, duration, current)
{
	if (current/duration > 0.9) {
		this.plex.setWatched(key, null);
	}
};

Player.prototype.showLoader = function(message)
{
	$("#loadMessage").text(message);
	$("#loader").show();
};

Player.prototype.hideLoader = function()
{
	$("#loader").hide();
};