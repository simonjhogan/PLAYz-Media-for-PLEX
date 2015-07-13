/**
PLAYz Media (PLEX for LG Media Center)

Copyright 2014 Simon J. Hogan (Sith'ari Consulting)

Licensed under the Apache License, Version 2.0 (the "License"); you may not use this 
file except in compliance with the License. You may obtain a copy of the License at

http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under 
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, 
either express or implied. See the License for the specific language governing permissions 
and limitations under the License.
**/

function Menu() {
	this.PLEX_SESSION_ID = "plexSessionID";
    	this.PLEX_PASSWORD_SEQUENCE = "plexPasswordSequence";
	this.PLEX_CURRENT_SECTION = "plexCurrentSection";
	this.PLEX_SERVER_LIST = "plexServerList";	
	this.PLEX_CURRENT_PREFIX = "plexHomeSelected-";
	this.PLEX_OPTIONS_PREFIX = "plexOptions-";
	
	this.currentPasswordSequence = [];
	this.ischeckinfForPass = false;
	this.isSettingPass = false;
	this.tmpPassSequence = '';
	this.pressedKeys = [];

	this.plex = new PLEX();	
	this.cache = "";
	this.toggleActive = false;
	this.titleScroll;
	this.scanErrorCount = 0;
	this.windowHeight = $(window).height();
	this.windowWidth = $(window).width();
	
	var self = this;

	//Enable page loading icon
	if (window.NetCastSetPageLoadingIcon) {
	    window.NetCastSetPageLoadingIcon('enabled');
	}

	//Set default aspect ratio
	if (window.NetCastSetDefaultAspectRatio) {
	    window.NetCastSetDefaultAspectRatio('original');
	}

	//Set session ID if blank
	if (!localStorage.getItem(this.PLEX_SESSION_ID) || localStorage.getItem(this.PLEX_SESSION_ID) == "") {
		localStorage.setItem(this.PLEX_SESSION_ID, this.plex.getSessionID());
	}

	if (localStorage.getItem(this.PLEX_OPTIONS_PREFIX + "largeText") == "1") {
		$("body").addClass("xlarge");
	}	
	
	this.debug = localStorage.getItem(this.PLEX_OPTIONS_PREFIX + "debug") == "1" ? true : false;
	if (this.debug) {
		var device = document.getElementById("device");
		
		html = "<table>";
		html += "<tr><th>Platform</th><td>" + device.platform + "</td></tr>";
		html += "<tr><th>Chipset</th><td>" + device.chipset + "</td></tr>";
		html += "<tr><th>HW Version</th><td>" + device.hwVersion + "</td></tr>";
		html += "<tr><th>SW Version</th><td>" + device.hwVersion + "</td></tr>";		
		html += "<tr><th>SDK Version</th><td>" + device.SDKVersion + "</td></tr>";
		html += "<tr><th>IP</td><th>" + device.net_ipAddress + "</td></tr>";		
		html += "<tr><th>Language</td><th>" + device.tvLanguage2 + "</td></tr>";
		html += "<tr><th>show hidden files</td><th>" + self.plex.getShouldShowHiddenFiles() + "</td></tr>";
		if (window.NetCastGetUsedMemorySize) {
			html += "<tr><th>Used Memory</th><td id=\"debugMemory\">" + window.NetCastGetUsedMemorySize() + "</td></tr>";		
		}
		html += "</table>";
		$("#debug").html(html);				
		$("#debug").show();
		
	}
	
	//Initialise Mousewheel scrolling
	$("#navigator #sections").mousewheel(function(event) {
		$(this).scrollTop($(this).scrollTop() - (event.deltaY * event.deltaFactor));
		event.preventDefault();
	}); 

	$("#recentlyAdded .content").mousewheel(function(event) {
		$(this).scrollLeft($(this).scrollLeft() - (event.deltaY * event.deltaFactor));
		event.preventDefault();
	}); 
	
	$("#query").focus(function(event) {
		if (window.NetCastSystemKeyboardVisible) {
			window.NetCastSystemKeyboardVisible(true);
		}
	});

	$("#query").blur(function(event) {
		if (window.NetCastSystemKeyboardVisible) {
			window.NetCastSystemKeyboardVisible(false);
		}	
	});
	
	$("#searchForm").submit(function() {
		if (window.NetCastSystemKeyboardVisible) {
			window.NetCastSystemKeyboardVisible(false);
		}		
	});
	
	$("#server").click(function() {
		self.serverSelection();
	});
	
	$(document).keydown(function (event) {

	    self.pressedKeys[event.which] = true;

//	    $("#passwordMessage").text(self.pressedKeys);
//	    $("#passwordMessage").show();

	    if (self.isResetPasswordSequence()) {
	        self.pressedKeys = [];
	        return;
	    }

	    switch (event.which) {
	        case 403: // Reset settings - RED button or ( key
	        case 122:
	            self.plex.panic();
	            break;
	        case 123:
	            self.serverSelection();
	            break;
	        case 461:
	        case 27:
	            self.close();
	            break
	        default:
	            if (!self.ischeckinfForPass && !self.isSettingPass) {

	                // green key
	                if (event.which == 404 || event.which == 123) {
	                    self.serverSelection();
	                }

	                // yellow key 
	                if (event.which == 405) {
	                }

	                // blue key
	                if (event.which == 406) {
	                    self.askforpass();
	                }

	            } else { //echo 5 key combination can be a password accept the already set ones
	                if (event.which != 1536) { //1536 IS THE REMOTE MOVMENT.
	                    if (self.isSettingPass) {
	                        self.setPass(event.keyCode);
	                    } else {
	                        self.isPasswordApproved(event.keyCode);
	                    }
	                }
	            }
	            break;
	    }
	   
	});


	$(document).keyup(function(event) {
	    self.pressedKeys[event.which] = false;
	});

	
	$("#settings").hide();
	
	$("#navigatorSwitch").click(function() {
		self.toggleMenu();
	});
	
	$("#previewClose").click(function() {
		$("#recentlyAdded .content").scrollLeft(0);
		$("#preview").fadeOut();
		$("#navigator #sections a.selected").focus();
	});	
};

Menu.prototype.serverSelection = function()
{
	var self = this;
	
	if (localStorage.getItem(this.PLEX_SERVER_LIST) && localStorage.getItem(this.PLEX_SERVER_LIST).length > 0) {
		var servers = localStorage.getItem(this.PLEX_SERVER_LIST).split(",");
		$("#serverSelect").empty();
		$.each(servers, function(index, value){
			var server = value.split("|");
			$("#serverSelect").append("<a data-key-index=\"" + index + "\"href=\"#\" data-address=\"" + server[1] + "\">" + server[0] + " (" + server[1] + ")</a>");	
		});
		
		$("#serverSelect a").hover(function() {
			$(this).focus();
		});
	
		$("#serverSelect a").click(function() {
			self.plex.setServerUrl($(this).data("address"));
			location.reload();
		});
	
		$("#serverSelect a").keydown(function(event) {
			var index = $(this).data("key-index");
			var previous = $(this).parents("#sections, #settings").find("li a[data-key-index='" + (Number(index)-1) + "']");
			var next = $(this).parents("#sections, #settings").find("li a[data-key-index='" + (Number(index)+1) + "']");
			
			// Up Arrow		
			if (event.which == 38) {
				event.preventDefault();
				$(this).prev().focus();
			}
			
			// Down Arrow
			if (event.which == 40) {
				event.preventDefault();
				$(this).next().focus();
			}
			
			// Back
			if (event.which == 461 || event.which == 27) {
				event.preventDefault();
				$("#serverSelect").hide();
				$("#navigator a.selected").focus();
			}			
		});
		
		$("#serverSelect").show();
		$("#serverSelect a:first").focus();	
	}
};


Menu.prototype.askforpass = function()
{

    this.ischeckinfForPass = true;
    this.currentPasswordSequence = [];

    if (!localStorage.getItem(this.PLEX_PASSWORD_SEQUENCE) || localStorage.getItem(this.PLEX_PASSWORD_SEQUENCE) == "") {

        $("#passwordMessage").text("Password is not set, please enter a combination of 5 blue,yellow,green");
        $("#passwordMessage").show();

        $("#passwordMessage").fadeOut(2000);

        this.ischeckinfForPass = false;
        this.isSettingPass = true;

    } else {

        $("#passwordMessage").text("Enter password sequence");
        $("#passwordMessage").show();
    }

};

Menu.prototype.isPasswordApproved = function (key) {
    var ret = this.checkPass(key);

    if (ret == 1) {
        this.plex.setShouldShowHiddenFiles("true");
        location.reload();
    } else if (ret == 0) {
        this.plex.setShouldShowHiddenFiles("false");
        location.reload();
    }
};

Menu.prototype.isResetPasswordSequence = function () {
    // blue and red

    if (this.pressedKeys[406] && this.pressedKeys[403]) {
        $("#passwordMessage").text("Password resetted");
        $("#passwordMessage").show();
        $("#passwordMessage").fadeOut(1500);
        localStorage.setItem(this.PLEX_PASSWORD_SEQUENCE, '');
        return true;
    }

    return false;
};
Menu.prototype.setPass = function (key) {

    if (this.ischeckinfForPass) {
        var ret = this.checkPass(key);
        if (ret == 1) {
            localStorage.setItem(this.PLEX_PASSWORD_SEQUENCE, this.currentPasswordSequence.toString());
        } else if (ret == 0) {
            this.tmpPassSequence = '';
        }
    }
    else {
        this.currentPasswordSequence.push(key);

        if (this.currentPasswordSequence.length == 5) {
            this.tmpPassSequence = this.currentPasswordSequence.toString();

            this.currentPasswordSequence = [];

            $("#passwordMessage").text("Please Retype the password");
            $("#passwordMessage").show();

            this.ischeckinfForPass = true;
        }
    }
};

Menu.prototype.checkPass = function (key) {
    
    var pass = this.isSettingPass ? this.tmpPassSequence : localStorage.getItem(this.PLEX_PASSWORD_SEQUENCE);

    this.currentPasswordSequence.push(key);
    
    if (this.currentPasswordSequence.toString().indexOf(pass) >= 0) {

        $("#passwordMessage").text("Passsword accepted");
        $("#passwordMessage").show();
        $("#passwordMessage").fadeOut(1500);

        this.ischeckinfForPass = false;
        this.isSettingPass = false;

        return 1;

        
        
    } else if (this.currentPasswordSequence.length >= 5) {

        this.currentPasswordSequence = [];

        $("#passwordMessage").text("Wrong sequence entered");
        $("#passwordMessage").show();
        $("#passwordMessage").fadeOut(1500);

        this.plex.setShouldShowHiddenFiles("false");
        this.ischeckinfForPass = false;
        this.isSettingPass = false;

        return 0;

    }

    return 2;

};
Menu.prototype.initialise = function(focus)	{	
	var self = this;
	var pms = this.plex.getServerUrl();
	
	self.showLoader("Searching");

	$("#passwordMessage").hide();

	//Check PMS Server Set
	if (!pms || !this.isValidUrl(self.plex.getServerUrl())) {
		self.hideLoader();
		this.settingsDialog(true);
		$("#settingsMessage").show();
		$("#settingsMessage").html(settings.language.dialogSettingsValidMessage);
		$("#settingsMessage").fadeOut(5000);		
	} else {		
		self.plex.checkLibraryServerExists(function(xml) {
			self.showLoader("Loading");
			$("#serverName").text($(xml).find("MediaContainer:first").attr("friendlyName"));	
			
			//Get Sections and Insert into Menu
			self.plex.getSections(function(xml) {
				var i = 0;
				$("#sections ul").empty();
				
				$(xml).find("Directory").each(function(index, item) {
				    if (self.plex.getShouldShowHiddenFiles()) {
				        html = "<li><a data-key-index=\"" + index + "\" data-title=\"" + self.plex.removeHiddenToken($(this).attr("title")) + "\" data-key=\"" + $(this).attr("key") + "\" data-section-type=\"" +
	                                    $(this).attr("type") + "\" data-art=\"" + self.plex.getTranscodedPath($(this).attr("art"), self.windowWidth, self.windowHeight) + "\" href>" + self.plex.removeHiddenToken($(this).attr("title")) + "</a></li>";
				        i = index;
				        $("#sections ul").append(html);
				    }
				    else  {
				        if (!self.plex.isMarkedAsHidden(item, "title")) {
				            html = "<li><a data-key-index=\"" + index + "\" data-title=\"" + $(this).attr("title") + "\" data-key=\"" + $(this).attr("key") + "\" data-section-type=\"" +
	                                   $(this).attr("type") + "\" data-art=\"" + self.plex.getTranscodedPath($(this).attr("art"), self.windowWidth, self.windowHeight) + "\" href>" + $(this).attr("title") + "</a></li>";
				            i = index;
				            $("#sections ul").append(html);
				        }
				    }
				});
		
					$("#sections ul").append("<li><a data-key-index=\"" + (++i) + "\" data-title=\"playlists\" data-key=\"playlists\" data-section-type=\"playlists\" data-art=\"" + self.plex.getTranscodedPath("/:/resources/movie-fanart.jpg", self.windowWidth, self.windowHeight) + "\" href>" + "Playlists" + "</a></li>");
					//$("#sections ul").append("<li><a data-key-index=\"" + (++i) + "\" data-title=\"channels\" data-key=\"channels\" data-section-type=\"channels\" data-art=\"" + self.plex.getTranscodedPath("/:/resources/movie-fanart.jpg", self.windowWidth, self.windowHeight) + "\" href>" + settings.language.sectionChannels + "</a></li>");
					$("#sections ul").append("<li><a data-key-index=\"" + (++i) + "\" data-title=\"ondeck\" data-key=\"ondeck\" data-section-type=\"ondeck\" data-art=\"" + self.plex.getTranscodedPath("/:/resources/movie-fanart.jpg", self.windowWidth, self.windowHeight) + "\" href>" + settings.language.sectionOnDeck + "</a></li>");
					$("#sections ul").append("<li><a data-key-index=\"" + (++i) + "\" data-title=\"search\" data-key=\"search\" data-section-type=\"search\" data-art=\"" + self.plex.getTranscodedPath("/:/resources/movie-fanart.jpg", self.windowWidth, self.windowHeight) + "\" href>" + settings.language.sectionSearch + "</a></li>");
				// Add Event Handlers
				$("#navigator #sections li a, #settings li a").off();
				
				$("#navigator #sections li a, #settings li a").focus(function(event) {
					var link = this;
					
					if (!$(this).hasClass("selected")) { 
						$(this).parents("#sections, #settings").find("li a").removeClass("selected");
						
						$(".dialog").hide();
						$("#recentlyAdded").removeClass("show-quick-menu");
						$("#recentlyAdded").hide();
		
						$(this).addClass("selected");
						
						var t = setTimeout(function() {	
							if ($(link).hasClass("selected")) {
								$.event.trigger({
									type: "navigationFocus",
									title: $(link).data("title"),					
									key: $(link).data("key"),
									sectionType: self.plex.getMediaType($(link).data("title"), $(link).data("sectionType")),
									art: $(link).data("art")				
								});
							}
						},500);
					}							
				});
			
				$("#navigator #sections li a, #settings li a").hover(function(event) {
					$(this).focus();
				});
			
				//Navigation click event handler
				$("#navigator #sections li a, #navigator #settings li a").click(function(event) {
					$.event.trigger({
						type: "navigationClick",
						title: $(this).data("title"),					
						key: $(this).data("key"),
						sectionType: self.plex.getMediaType($(this).data("title"), $(this).data("sectionType")),
						art: $(this).data("art")					
					});	
					event.preventDefault();
				});
			
				// Handle Arrow Key Navigation
				$("#sections a, #settings a").keydown(function(event) {
					var index = $(this).data("key-index");
					var previous = $(this).parents("#sections, #settings").find("li a[data-key-index='" + (Number(index)-1) + "']");
					var next = $(this).parents("#sections, #settings").find("li a[data-key-index='" + (Number(index)+1) + "']");
					
					// Up Arrow		
					if (event.which == 38) {
						event.preventDefault();
						if (Number(index) == 0) {
							self.serverSelection();
						}
						previous.focus();
					}
					
					// Down Arrow
					if (event.which == 40) {
						event.preventDefault();
						next.focus();
					}
					
					// Left Arrow
					if (event.which == 37) {
						event.preventDefault();
						self.toggleMenu();
					}
					
					// Right Arrow - Quick Select
					if (event.which == 39) {
						event.preventDefault();
						$.event.trigger({
							type: "navigationQuickSelect",
							title: $(this).data("title"),					
							key: $(this).data("key"),
							sectionType: self.plex.getMediaType($(this).data("title"), $(this).data("sectionType")),
							art: $(this).data("art")					
						});		
					}		
				});
				
				self.setClock();
				self.hideLoader();
				
				if (focus) {
					$(focus).focus();
				} else {
					if (localStorage.getItem(self.PLEX_CURRENT_SECTION) && $("#sections li a[data-key='" + localStorage.getItem(self.PLEX_CURRENT_SECTION) + "']:first").length > 0) {
						$("#sections li a[data-key='" + localStorage.getItem(self.PLEX_CURRENT_SECTION) + "']:first").focus();
					} else {
						$("#sections li a:first").focus();
					}
				}
			});
			
			$(document).on("navigationQuickSelect", function(event) {					
				switch(event.sectionType) {
					case "settings":
						$("#scan").focus();
						break;
	
					case "search":
						$("#query").focus();
						break;

					case "options":
						$("#optionTimeDisplay").focus();
						break;						
					case "playlists":
						//$("#scan").focus();
					break;
					default:
						localStorage.setItem(self.PLEX_CURRENT_SECTION, event.key);
						if ($("#recentlyAdded").hasClass("show-quick-menu")) {
							$("#recentlyAdded a:first").focus();
						}
						break;
					}
			});
			
			$(document).on("navigationClick", function(event) {			
				switch(event.sectionType) {
					case "quit":
						self.close();
						break;
	
					case "home":		
					case "movie":
					case "photo":	
					case "show":			
					case "artist":	
				    	case "channels":
				    	case "playlists":
						self.showLoader("Loading");
						location.href = "media.html?action=view&section=" + event.sectionType + "&key=" + event.key;
						break;
				
				}
			});
			
			$(document).on("navigationFocus", function(event) {			
				if (event.art) {
					$("#applicationWallpaper").css("background-image", "url(" + event.art + ")");
				}
				
				switch(event.sectionType) {
					case "search":
						self.quickSearchMenu(event);
						break;
									
					case "settings":
						self.settingsDialog();
						break;

					case "options":
						self.optionsDialog();
						break;
						
					case "about":
						$("#about").show();
						break;
		
					case "help":
						$("#help").show();
						break;
		
											
					case "home":		
					case "movie":
					case "photo":	
					case "show":			
					case "artist":
					case "ondeck":	
				   	case "channels":
				    	case "playlists":
						localStorage.setItem(self.PLEX_CURRENT_SECTION, event.key);	
						self.quickSelectionMenu(event);
						break;							
				}		
			});	
		}, function() {
			//Server not found
			self.hideLoader();			
			self.settingsDialog(true);
			$("#settingsMessage").show();
			$("#settingsMessage").html(settings.language.dialogSettingsAddressNotFoundMessage);
			$("#settingsMessage").fadeOut(5000);
		});
	}
};

Menu.prototype.quickSearchMenu = function(event)
{
	$("#search").fadeIn();
	
	$("#search input, #search button").keydown(function(event) {
		
		// Up Arrow		
		if (event.which == 38) {
			if ($(this).data("keyUp")) {
				$($(this).data("keyUp")).focus();
				event.preventDefault();
			}
		}
		
		// Down Arrow
		if (event.which == 40) {
			if ($(this).data("keyDown")) {
				$($(this).data("keyDown")).focus();
				event.preventDefault();
			}	
		}
		
		// Left Arrow
		if (event.which == 37) {
			if ($(this).data("keyLeft")) {
				$($(this).data("keyLeft")).focus();
				event.preventDefault();
			}
		}
		
		// Right Arrow
		if (event.which == 39) {
			if ($(this).data("keyRight")) {
				$($(this).data("keyRight")).focus();
				event.preventDefault();
			}
		}
		
		// Back
		if (event.which == 461 || event.which == 27) {		
			$("#navigator a.selected").focus();
			window.NetCastSystemKeyboardVisible(false);
			event.preventDefault();
			event.stopPropagation();				
		}		
	});	
};

Menu.prototype.quickSelectionMenu = function(event)
{
	var self = this;
	var maxItems = 30;
	var options = {"start": 0,"size": maxItems};
	
	self.showLoader("Loading");
	//console.log(">>" + event.sectionType);
	
	self.plex.getMediaItems(event.sectionType, event.key, function(xml) {
		var sectionType = event.sectionType;
		var sectionKey = event.key;
		this.cache = xml;
		var current = this;
		
		$("#recentlyAdded .content ul").empty();
		$(xml).find("Directory,Video,Photo").each(function (index, item) {
		    if (self.plex.getShouldShowHiddenFiles() || !self.plex.isMarkedAsHidden(item, "title")) { // only contents that are not marked as hidden will show, or hidden files while show hidden 

		        if (index < maxItems) {
		            html = self.plex.getThumbHtml(index, self.plex.removeHiddenToken($(this).attr("title")), sectionType + " recent", $(this).attr("type"), $(this).attr("key"),
                        {
                            "thumb": $(this).attr("thumb"),
                            "parentThumb": $(this).attr("parentThumb"),
                            "grandparentThumb": $(this).attr("grandparentThumb"),
                            "art": $(this).attr("art"),
                            "artist": $(this).attr("parentTitle"),
                            "series": $(this).attr("grandparentTitle"),
                            "season": $(this).attr("parentIndex"),
                            "episode": $(this).attr("index"),
                            "parentKey": $(this).attr("parentKey"),
                            "lastViewedAt": $(this).attr("lastViewedAt"),
                            "viewOffset": $(this).attr("viewOffset"),
                            "duration": $(this).attr("duration"),
                            "viewCount": $(this).attr("viewCount"),
                            "media": $(this).find("Media Part:first").attr("key"),
                            "sectionKey": $(this).attr("librarySectionID") ? $(this).attr("librarySectionID") : sectionKey
                        });
		            $("#recentlyAdded .content ul").append(html);
		        }
		    }
		});
        
		if (html) {
		    $("#recentlyAdded").attr("data-current-key", event.key);
		    $("#recentlyAdded").show();
		    $("#recentlyAdded").addClass("show-quick-menu");

		    if (sectionType == "channels") {
		        $("#recentlyAdded .name").html(settings.language.sectionChannels);
		    } else {
		        $("#recentlyAdded .name").html(settings.language.menuRecentlyAdded);
		    }

		    $("#recentlyAdded a").hover(function () {
		        $(this).focus();
		    });

		    $("#recentlyAdded a").click(function (event) {
		        event.preventDefault();
		        self.showLoader("Loading");
		        url = "./item.html?action=preview&section=" + sectionType + "&sectionKey=" + sectionKey + "&key=" + encodeURIComponent($(this).data("key"));
		        $(this).attr("href", url);
		        location.href = url;
		    });

		    $("#recentlyAdded a").focus(function (event) {
		        var current = this;
		        var item = $(this);
		        var left = 0;

		        localStorage.setItem(self.PLEX_CURRENT_PREFIX + $(this).data("sectionType"), $(this).data("key"));

		        switch ($(this).data("mediaType")) {
		            case "album":
		                self.plex.getMediaMetadata($(this).data("key"), function (xml) {
		                    var metadata = $(xml).find("MediaContainer:first");

		                    var tracks = [];
		                    $(metadata).find("Track").each(function () { tracks.push($(this).attr("index") + ". " + $(this).attr("title")) });

		                    if ($("#recentlyAdded a:focus").data("key") == $(current).data("key")) {
		                        $("#previewContent").html(self.plex.getMediaHtml(metadata.attr("title2"), "album",
                                    {
                                        "art": metadata.attr("art"),
                                        "thumb": metadata.attr("thumb"),
                                        "artist": metadata.attr("title1"),
                                        "year": metadata.attr("parentYear"),
                                        "tracks": tracks
                                    }));
		                        $("#preview").fadeIn();
		                    }
		                });
		                break;

				case "episode":
					self.plex.getMediaMetadata($(this).data("key"), function(xml) { 
						var metadata = $(xml).find("Video:first");
																		
						if ($("#recentlyAdded a:focus").data("key") == $(current).data("key")) {
							$("#previewContent").html(self.plex.getMediaHtml(metadata.attr("title"), metadata.attr("type"), 
								{"art": metadata.attr("art"),
								"thumb": metadata.attr("thumb"),
								"lastViewedAt": metadata.attr("lastViewedAt"),
								"viewOffset": metadata.attr("viewOffset"),
								"viewCount": metadata.attr("viewCount"),
								"duration": metadata.attr("duration"),
								"parentThumb": metadata.attr("parentThumb"),
								"summary": metadata.attr("summary"),
								"grandparentTitle": metadata.attr("grandparentTitle"),
								"index": metadata.attr("index"),
								"parentIndex": metadata.attr("parentIndex"),
								"contentRating": metadata.attr("contentRating"),
								"rating": metadata.attr("rating"),
								"year": metadata.attr("year")																
							}));
							$("#preview").fadeIn();
						}
					});
					break;

				case "movie":
					self.plex.getMediaMetadata($(this).data("key"), function(xml) { 
						var metadata = $(xml).find("Video:first");

						var roles = [];
						$(metadata).find("Role").each(function() { roles.push($(this).attr("tag")) });

						var genre = [];
						$(metadata).find("Genre").each(function() { genre.push($(this).attr("tag")) });

						
						if ($("#recentlyAdded a:focus").data("key") == $(current).data("key")) {
							$("#previewContent").html(self.plex.getMediaHtml(metadata.attr("title"), metadata.attr("type"), 
								{"art": metadata.attr("art"),
								"thumb": metadata.attr("thumb"),
								"lastViewedAt": metadata.attr("lastViewedAt"),
								"viewOffset": metadata.attr("viewOffset"),
								"viewCount": metadata.attr("viewCount"),
								"tagline": metadata.attr("tagline"),
								"summary": metadata.attr("summary"),
								"studio": metadata.attr("studio"),
								"year": metadata.attr("year"),
								"rating": metadata.attr("rating"),
								"contentRating": metadata.attr("contentRating"),
								"director": $(metadata).find("Director:first").attr("tag"),
								"roles": roles,
								"genre": genre,
								"duration": metadata.attr("duration")															
							}));
							$("#preview").fadeIn();
						}
					});
					break;
					
				case "photo":
					self.plex.getMediaMetadata($(this).data("key"), function(xml) { 
						var metadata = $(xml).find("Photo:first");
						
						if ($("#recentlyAdded a:focus").data("key") == $(current).data("key")) {						
							$("#previewContent").html(self.plex.getMediaHtml(metadata.attr("title"), metadata.attr("type"), 
								{"art": metadata.attr("art"),
								"thumb": metadata.attr("thumb"),
								"summary": metadata.attr("summary"),
								"year": metadata.attr("year"),
								"width": metadata.find("Media:first").attr("width"),
								"height": metadata.find("Media:first").attr("height"),
								"container": metadata.find("Media:first").attr("container")																																						
							}));
							$("#preview").fadeIn();
						}
					});
					break
				
				case "channel":
					//Do nothing
					break;
					
				default:
					self.plex.getMediaMetadata($(this).data("key"), function(xml) { 
						var metadata = $(xml).find("Directory:first,Video:first,Photo:first,Track:first");
						
						if ($("#recentlyAdded a:focus").data("key") == $(current).data("key")) {
							$("#previewContent").html(self.plex.getMediaHtml(metadata.attr("title"), metadata.attr("type"), 
								{"art": metadata.attr("art"),
								"thumb": metadata.attr("thumb"),
								"summary": metadata.attr("summary"),
								"year": metadata.attr("year")														
							}));
							$("#preview").fadeIn();
						}
					});
					break
			}
		});

		//Handle Quick Select Menu Keys						
		$("#recentlyAdded a").keydown(function(event) {
			var index = $(this).data("key-index");
			var previous = $(this).parents(".content").find("ul li a[data-key-index='" + (Number(index)-1) + "']");
			var next = $(this).parents(".content").find("ul li a[data-key-index='" + (Number(index)+1) + "']");
			var length = $(this).parents(".content").find("ul li").length;
			//console.log(index + " ... " + length + " : " + (index*142-142));
			//console.log($("#recentlyAdded .content").scrollLeft());
			
			// Left Arrow
			if (event.which == 37) {
				event.preventDefault();
				if (index == 0) {
					$("#recentlyAdded .content").scrollLeft(0);
					$("#preview").fadeOut();
					$("#navigator #sections a.selected").focus();
				} 
				
				if (index < length-3) {
					$("#recentlyAdded .content").scrollLeft((index-2)*142-142);
				}
				previous.focus();
			}
			
			// Right Arrow - Quick Select
			if (event.which == 39) {
				event.preventDefault();
				if (index >= 2) {
					$("#recentlyAdded .content").scrollLeft(index*142-142);
				}
				
				next.focus();
			}
			
			// Play Button
			if (event.which == 415 || event.which == 80) {
				event.preventDefault();
				if ($(this).data("media") && $(this).data("media") != "undefined") {
					self.showLoader("Loading");
					location.href = "player.html?key=" + $(this).data("key") + "&autoplay=true";
				}
			}
			
			if (event.which == 461 || event.which == 27) {
				event.preventDefault();
				$("#recentlyAdded .content").scrollLeft(0);
				$("#preview").fadeOut();
				$("#navigator #sections a.selected").focus();
			}			
		});	
		
		$(".thumb").lazyload({
			threshold : 400,
			placeholder: 'system/images/poster.png',
			container: $("#recentlyAdded .content")
		});
		
		self.hideLoader();
		}
	}, options);
};

Menu.prototype.setCheckOption = function(item, optionName)
{
	var icon = $(item).find("i");
	if (icon.hasClass("unchecked")) {
		icon.removeClass("unchecked");
		icon.addClass("check");
		localStorage.setItem(optionName, "1");
	} else {
		icon.removeClass("check");
		icon.addClass("unchecked");	
		localStorage.setItem(optionName, "0");
	}
};

Menu.prototype.optionsDialog = function(event)
{
	var self = this;
	
	if (localStorage.getItem(this.PLEX_OPTIONS_PREFIX + "enableTranscoding") == "1") {
		$("#options a#optionTranscoding i").removeClass("unchecked");
		$("#options a#optionTranscoding i").addClass("check");	
	}

	if (localStorage.getItem(this.PLEX_OPTIONS_PREFIX + "standalonePlayer") == "1") {
		$("#options a#optionStandalonePlayer i").removeClass("unchecked");
		$("#options a#optionStandalonePlayer i").addClass("check");	
	}
	
	if (localStorage.getItem(this.PLEX_OPTIONS_PREFIX + "time24") == "1") {
		$("#options a#optionTimeDisplay i").removeClass("unchecked");
		$("#options a#optionTimeDisplay i").addClass("check");	
	}

	if (localStorage.getItem(this.PLEX_OPTIONS_PREFIX + "titleOverlay") == "1") {
		$("#options a#optionTitleOverlays i").removeClass("unchecked");
		$("#options a#optionTitleOverlays i").addClass("check");	
	}

	if (localStorage.getItem(this.PLEX_OPTIONS_PREFIX + "themeMusic") == "1") {
		$("#options a#optionNoThemeMusic i").removeClass("unchecked");
		$("#options a#optionNoThemeMusic i").addClass("check");	
	}

	if (localStorage.getItem(this.PLEX_OPTIONS_PREFIX + "nextEpisode") == "1") {
		$("#options a#optionDisableNextEpisodePlay i").removeClass("unchecked");
		$("#options a#optionDisableNextEpisodePlay i").addClass("check");	
	}	

	if (localStorage.getItem(this.PLEX_OPTIONS_PREFIX + "hoverBackdrop") == "1") {
		$("#options a#optionBackdropHover i").removeClass("unchecked");
		$("#options a#optionBackdropHover i").addClass("check");	
	}

	if (localStorage.getItem(this.PLEX_OPTIONS_PREFIX + "watchedIcons") == "1") {
		$("#options a#optionDisableWatchedIcons i").removeClass("unchecked");
		$("#options a#optionDisableWatchedIcons i").addClass("check");	
	}

	if (localStorage.getItem(this.PLEX_OPTIONS_PREFIX + "largeText") == "1") {
		$("#options a#optionLargeText i").removeClass("unchecked");
		$("#options a#optionLargeText i").addClass("check");	
	}

	if (localStorage.getItem(this.PLEX_OPTIONS_PREFIX + "seekSmall") == "1") {
		$("#options a#optionSeekSmall i").removeClass("unchecked");
		$("#options a#optionSeekSmall i").addClass("check");
	}
	var seekSmallCustom = localStorage.getItem(this.PLEX_OPTIONS_PREFIX + "seekSmallCustom");
	if (seekSmallCustom != "" && !isNaN(seekSmallCustom)) {
		$("#options input#optionSeekSmallCustom").val(Math.round(seekSmallCustom) || "");
	}
	
	if (localStorage.getItem(this.PLEX_OPTIONS_PREFIX + "debug") == "1") {
		$("#options a#optionDebugDetails i").removeClass("unchecked");
		$("#options a#optionDebugDetails i").addClass("check");	
	}
	
	if (localStorage.getItem(this.PLEX_OPTIONS_PREFIX + "smallPicutres") == "1") {
		$("#options a#optionSmallPictures i").removeClass("unchecked");
		$("#options a#optionSmallPictures i").addClass("check");	
	}
	
	if (localStorage.getItem(this.PLEX_OPTIONS_PREFIX + "allItems") == "1") {
	    $("#options a#optionAllItems i").removeClass("unchecked");
	    $("#options a#optionAllItems i").addClass("check");
	}
	
	$("#options").show();
	$("#options a").off();
	$("#options a").hover(function() {
		$(this).focus();
	});

	$("#options a#optionTranscoding").click(function(event) {
		event.preventDefault();
		self.setCheckOption(this, self.PLEX_OPTIONS_PREFIX + "enableTranscoding");
	});

	$("#options a#optionStandalonePlayer").click(function(event) {
		event.preventDefault();
		self.setCheckOption(this, self.PLEX_OPTIONS_PREFIX + "standalonePlayer");
	});
	
	$("#options a#optionTimeDisplay").click(function(event) {
		event.preventDefault();
		self.setCheckOption(this, self.PLEX_OPTIONS_PREFIX + "time24");
	});

	$("#options a#optionTitleOverlays").click(function(event) {
		event.preventDefault();
		self.setCheckOption(this, self.PLEX_OPTIONS_PREFIX + "titleOverlay");		
	});

	$("#options a#optionNoThemeMusic").click(function(event) {
		event.preventDefault();
		self.setCheckOption(this, self.PLEX_OPTIONS_PREFIX + "themeMusic");		
	});

	$("#options a#optionDisableNextEpisodePlay").click(function(event) {
		event.preventDefault();
		self.setCheckOption(this, self.PLEX_OPTIONS_PREFIX + "nextEpisode");		
	});

	$("#options a#optionBackdropHover").click(function(event) {
		event.preventDefault();
		self.setCheckOption(this, self.PLEX_OPTIONS_PREFIX + "hoverBackdrop");		
	});

	$("#options a#optionDisableWatchedIcons").click(function(event) {
		event.preventDefault();
		self.setCheckOption(this, self.PLEX_OPTIONS_PREFIX + "watchedIcons");		
	});

	$("#options a#optionLargeText").click(function(event) {
		event.preventDefault();
		self.setCheckOption(this, self.PLEX_OPTIONS_PREFIX + "largeText");	
		if (localStorage.getItem(self.PLEX_OPTIONS_PREFIX + "largeText") == "1") {
			$("body").addClass("xlarge");
		} else {
			$("body").removeClass("xlarge");
		}
	});

	$("#options a#optionSeekSmall").click(function(event) {
		event.preventDefault();
		self.setCheckOption(this, self.PLEX_OPTIONS_PREFIX + "seekSmall");		
	});
	
	$("#options input#optionSeekSmallCustom").keydown(function(event) {
		var val = $(this).val() || 0;
		
		// increase/decrease custom seek time
		
		// Up Arrow		
		if (event.which == 38) {
			if (val >= 600) // max 10 minutes
				val = 600
			else
				val++;
			$(this).val(val);
			event.preventDefault();
		}
		
		// Down Arrow
		if (event.which == 40) {
			if (val <= 1) // min 1 second
				val = 1
			else
				val--;
			$(this).val(val);
			event.preventDefault();	
		}
	});
	
	$("#options input#optionSeekSmallCustom").blur(function(event) {
		// Save option when the field loses focus
		event.preventDefault();
		localStorage.setItem(self.PLEX_OPTIONS_PREFIX + "seekSmallCustom", $(this).val());
		
		// If input is changed, enable the seekSmall checkbox if it's not already
		if (localStorage.getItem(self.PLEX_OPTIONS_PREFIX + "seekSmall") != "1" && $(this).val()) {
			$("#options a#optionSeekSmall").click();
		}
	});
	
	$("#options a#optionDebugDetails").click(function(event) {
		event.preventDefault();
		self.setCheckOption(this, self.PLEX_OPTIONS_PREFIX + "debug");		
	});
	
	$("#options a#optionSmallPictures").click(function(event) {
		event.preventDefault();
		self.setCheckOption(this, self.PLEX_OPTIONS_PREFIX + "smallPicutres");		
	});
	
	$("#options a#optionAllItems").click(function (event) {
	    event.preventDefault();
	    self.setCheckOption(this, self.PLEX_OPTIONS_PREFIX + "allItems");
	});
		
	$("#options a, #options input, #options button").keydown(function(event) {
		
		// Up Arrow		
		if (event.which == 38) {
			if ($(this).data("keyUp")) {
				$($(this).data("keyUp")).focus();
				event.preventDefault();
			}
		}
		
		// Down Arrow
		if (event.which == 40) {
			if ($(this).data("keyDown")) {
				$($(this).data("keyDown")).focus();
				event.preventDefault();
			}	
		}
		
		// Left Arrow
		if (event.which == 37) {
			if ($(this).data("keyLeft")) {
				$($(this).data("keyLeft")).focus();
				event.preventDefault();
			}
		}
		
		// Right Arrow
		if (event.which == 39) {
			if ($(this).data("keyRight")) {
				$($(this).data("keyRight")).focus();
				event.preventDefault();
			}
		}
		
		//Back
		if (event.which == 461 || event.which == 27) {		
			$("#navigator a.selected").focus();
			event.preventDefault();
			event.stopPropagation();				
		}		
	});	
	
	// Clear seekSmallCustom input field value
	$("#seekSmallClear").click(function(event) {
		$("#options input#optionSeekSmallCustom").val("");
		$("#options input#optionSeekSmallCustom").focus();
	});
	
	
};

Menu.prototype.toggleMenu = function()
{	
	var self = this;

	if (!this.toggleActive) {
		this.toggleActive = true;
		
		$("#navigator a.selected").addClass("return");
		$("#navigator a.selected").removeClass("selected");
		
		if ($("#navigator").hasClass("flip")) {
			$("#sections").show();
			$("#navigator").removeClass("flip");			
			$("#settings").fadeOut(600, function() {
				if ($("#sections a").hasClass("return")) {
					$("#sections a.return").focus();
					$("#sections a.return").removeClass("return");
				} else {
					$("#sections a:first").focus();
				}	
				self.toggleActive = false;			
			});
		} else {
			$("#settings").show();
			$("#navigator").addClass("flip");
			$("#sections").fadeOut(600, function() {
				$("#settings a.return").focus();
				$("#settings a.return").removeClass("return");
				self.toggleActive = false;			
			});
		}
	}		
};

Menu.prototype.settingsDialog = function(init)
{
	var self = this;
	var device = document.getElementById("device");
	var ip = device.net_ipAddress;
	var servers = new Array();
	
	$("#config").fadeIn(400, function() {
		if (init) {
			$("#scan").focus();
		}		
	});
	
	$("#settingsMessage").html("");
	var pms = this.plex.getServerUrl();
	
	if (pms) {
		$("#pms").val(pms.substr(pms.indexOf("://")+3));
	}
	
	$("#save").off();
	$("#scan").off();
	
	$("#save").click(function() {
		event.preventDefault();
		var pms = $("#pms").val();
		
		if (pms.indexOf("http") > -1) {
			$("#settingsMessage").show();
			$("#settingsMessage").html(settings.language.dialogSettingsRemoveMessage);
			$("#settingsMessage").fadeOut(5000);
			return false;
		}
		
		if (pms.indexOf(":") == -1) {
			pms = pms + ":32400";
		}
		
		self.plex.setServerUrl("http://" + pms);
		location.reload();
	});

	$("#scan").click(function() {
		event.preventDefault();
		self.scanErrorCount = 0;
		self.scanFoundCount = 0;
		if (!ip) {
			ip = "10.0.0.1";
		}
		
		self.showLoader("Scanning");
		$("#settingsMessage").html("");
		$("#settingsMessage").show();
		self.plex.scanNetwork(ip, function(xml) {
			self.scanFoundCount++;
			$("#pms").val(this.url.substr(this.url.indexOf("://")+3));
			servers.push($(xml).find("MediaContainer:first").attr("friendlyName") + "|" + this.url);
			$("#settingsMessage").html(settings.language.dialogSettingsFoundMessage + this.url + " " + $(xml).find("MediaContainer:first").attr("friendlyName"));
			$("#settingsMessage").fadeOut(3000);
			self.showLoader("PMS found");
		},function() {
			self.scanErrorCount++;
			if (self.scanErrorCount >= 255) {
				$("#settingsMessage").html(settings.language.dialogSettingsNotFoundMessage);
				$("#settingsMessage").fadeOut(3000);
				self.showLoader("Error");
			}					
		},function(xml) {
			localStorage.setItem(self.PLEX_SERVER_LIST, servers.unique().join(","));
			
			if (servers.unique().length > 1) {	
				$("#settingsMessage").html(settings.language.dialogSettingsMultipleMessage);
				$("#settingsMessage").fadeOut(3000);				
			}
			self.hideLoader();
		});
	});

	$("#config .keypad").click(function(event) {
		var key = $(this).text();
		var pms = $("#pms").val();
		var	caret = $("#pms").caret();
								
		switch($(this).attr("id")) {
			case "kcl":
				$("#pms").val("");
				break;

			case "kb":
				if (caret > 0) {
					var chars = $("#pms").val().split("");
					chars.splice(caret-1, 1);
					$("#pms").val(chars.join(""));
					$("#pms").caret(caret-1);
					$("#kb").focus();
				}
				break;

			default:
					var chars = $("#pms").val().split("");
					chars.splice(caret, 0, key);
					$("#pms").val(chars.join(""));
					$("#pms").caret(caret+1);
					$(this).focus();
					//$("#pms").val(pms + key);
				break;
		}
		event.preventDefault();
	});
	
	$("#config input, #config button").keydown(function(event) {
		
		// Up Arrow		
		if (event.which == 38) {
			if ($(this).data("keyUp")) {
				$($(this).data("keyUp")).focus();
				event.preventDefault();
			}
		}
		
		// Down Arrow
		if (event.which == 40) {
			if ($(this).data("keyDown")) {
				$($(this).data("keyDown")).focus();
				event.preventDefault();
			}	
		}
		
		// Left Arrow
		if (event.which == 37) {
			if ($(this).data("keyLeft")) {
				$($(this).data("keyLeft")).focus();
				//event.preventDefault();
			}
		}
		
		// Right Arrow
		if (event.which == 39) {
			if ($(this).data("keyRight")) {
				$($(this).data("keyRight")).focus();
				//event.preventDefault();
			}
		}
		
		//Back
		if (event.which == 461 || event.which == 27) {	
			$("#navigator a.selected").focus();		
			event.preventDefault();
			event.stopPropagation();			
		}		
	});	
	
	if (init) {
		//this.toggleMenu();
		//$("#navigator #settings li a[data-title='Settings'").addClass("selected");
		$("#scan").focus();
	}	
};

Menu.prototype.setClock = function()
{
	var self = this;
	
	try {
		var device = document.getElementById("device");
		
		/*if (device.getLocalTime) {
			var now = device.getLocalTime();
			var hours = now.hour;
			var minutes = now.minute;
			var seconds = now.second;
			var ampm = hours >= 12 ? 'PM' : 'AM';
			minutes = minutes < 10 ? '0'+minutes : minutes;
			seconds = seconds < 10 ? '0'+seconds : seconds;
			
			if (localStorage.getItem(this.PLEX_OPTIONS_PREFIX + "time24") == "1") {
				$("#clock").text(hours + ':' + minutes + ":" + seconds);
			} else {
				hours = hours % 12;
				hours = hours ? hours : 12; // hour '0' should be '12'
				$("#clock").text(hours + ':' + minutes + ":" + seconds + ' ' + ampm);
			}
		} else {*/
			var now = new Date();
			$("#clock").text(now.toLocaleTimeString());
		//}
	
		if (self.debug) {
			if (window.NetCastGetUsedMemorySize) {
				$("#debugMemory").text(window.NetCastGetUsedMemorySize());		
			}
		}	
	} catch(err) {
		var now = new Date();
		$("#clock").text(now.toLocaleTimeString());	
	}
	clock = setTimeout(function(){self.setClock();}, 500);
};

Menu.prototype.showLoader = function(message)
{
	$("#message").text(message);
	$("#loader").show();
};

Menu.prototype.hideLoader = function()
{
	$("#loader").hide();
};

Menu.prototype.close = function()
{
    	//alert("Close...");

    	this.plex.setShouldShowHiddenFiles("false");

	if (window.NetCastExit) {
		window.NetCastBack();
	} else {
		window.close();
	}
};

Menu.prototype.isValidUrl = function(s) {
	if (s.length < 14) {
		return false;
	}
	var regexp = /(http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/
	return regexp.test(s);
};

Array.prototype.unique = function() {
    var o = {}, i, l = this.length, r = [];
    for(i=0; i<l;i+=1) o[this[i]] = this[i];
    for(i in o) r.push(o[i]);
    return r;
};
