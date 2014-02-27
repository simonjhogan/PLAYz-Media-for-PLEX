/*
** PLEX for LG Media Center
** Created by Simon J. Hogan
** Copyright 2013 h3consulting
** http://plex.h3consulting.net
**/

function Menu() {
	this.PLEX_SESSION_ID = "plexSessionID";
	this.PLEX_CURRENT_SECTION = "plexCurrentSection";
	this.PLEX_SERVER_LIST = "plexServerList";	
	this.PLEX_CURRENT_PREFIX = "plexHomeSelected-";
	this.PLEX_OPTIONS_PREFIX = "plexOptions-";
	
	this.plex = new PLEX();	
	this.cache = "";
	this.toggleActive = false;
	this.titleScroll;
	this.scanErrorCount = 0;
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
	
	$(document).keypress(function(event) {
		// Reset settings - RED button or q key
		if (event.which == 403 || event.which == 81) {
			if (confirm("Press OK to RESET settings ...")) {
				self.plex.removeServerUrl();
				location.reload();
			}
		}	
		
		if (event.which == 404 || event.which == 83) {
			self.serverSelection();
		}
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

Menu.prototype.initialise = function(focus)	{	
	var self = this;
	var pms = this.plex.getServerUrl();
	
	self.showLoader("Searching");
				
	//Check PMS Server Set
	if (!pms || !this.isValidUrl(self.plex.getServerUrl())) {
		self.hideLoader();
		this.settingsDialog(true);
		$("#settingsMessage").show();
		$("#settingsMessage").html("Please enter a valid PMS address ...<br/>example: 192.168.0.1:32400");
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
					html = "<li><a data-key-index=\"" + index + "\" data-title=\"" + $(this).attr("title") + "\" data-key=\"" + $(this).attr("key") + "\" data-section-type=\"" + 
							$(this).attr("type") + "\" data-art=\"" + self.plex.getTranscodedPath($(this).attr("art"), 1280, 720) + "\" href>" +  $(this).attr("title")  + "</a></li>";	
					i = index;		
					$("#sections ul").append(html);
				});
		
				$("#sections ul").append("<li><a data-key-index=\"" + (i+1) + "\" data-title=\"ondeck\" data-key=\"ondeck\" data-section-type=\"ondeck\" data-art=\"" + self.plex.getTranscodedPath("/:/resources/movie-fanart.jpg", 1280, 720) + "\" href>On Deck</a></li>");
				$("#sections ul").append("<li><a data-key-index=\"" + (i+2) + "\" data-title=\"search\" data-key=\"search\" data-section-type=\"search\" data-art=\"" + self.plex.getTranscodedPath("/:/resources/movie-fanart.jpg", 1280, 720) + "\" href>Search</a></li>");
				
		
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
			$("#settingsMessage").text("The PMS server was not found on the address specified!");
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
	});	
	
};

Menu.prototype.quickSelectionMenu = function(event)
{
	var self = this;
	var maxItems = 30;
	
	self.showLoader("Loading");
			
	self.plex.getMediaItems(event.sectionType, event.key, function(xml) {
		var sectionType = event.sectionType;
		var sectionKey = event.key;
		this.cache = xml;
		var current = this;
		
		$("#recentlyAdded .content ul").empty();
		$(xml).find("Directory,Video,Photo").each(function(index, item) {
			if (index < maxItems) {
				html = self.plex.getThumbHtml(index, $(this).attr("title"), sectionType + " recent", $(this).attr("type"), $(this).attr("key"), 
					{"thumb": $(this).attr("thumb"),
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
		});
		$("#recentlyAdded").attr("data-current-key", event.key);
		$("#recentlyAdded").show();
		$("#recentlyAdded").addClass("show-quick-menu");
		
		$("#recentlyAdded a").hover(function() {
			$(this).focus();
		});

		$("#recentlyAdded a").click(function(event) {
			event.preventDefault();
			self.showLoader("Loading");
			url = "./item.html?action=preview&section=" + sectionType + "&sectionKey=" + sectionKey + "&key=" + encodeURIComponent($(this).data("key"));
			$(this).attr("href", url);
			location.href = url;
		});

		$("#recentlyAdded a").focus(function(event) {
			var current = this;
			var item = $(this);
			var left = 0;
			
			localStorage.setItem(self.PLEX_CURRENT_PREFIX + $(this).data("sectionType"), $(this).data("key"));

			switch($(this).data("mediaType")) {
				case "album":
					self.plex.getMediaMetadata($(this).data("key"), function(xml) { 
						var metadata = $(xml).find("MediaContainer:first");
						
						var tracks = [];
						$(metadata).find("Track").each(function() { tracks.push($(this).attr("index") + ". " + $(this).attr("title")) });
						
						if ($("#recentlyAdded a:focus").data("key") == $(current).data("key")) {
							$("#previewContent").html(self.plex.getMediaHtml(metadata.attr("title2"), "album", 
								{"art": metadata.attr("art"),
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
	
			// Left Arrow
			if (event.which == 37) {
				event.preventDefault();
				if (index == 0) {
					$("#recentlyAdded .content").scrollLeft(0);
					$("#preview").fadeOut();
					$("#navigator #sections a.selected").focus();
				} else if (index == 1) {
					$("#recentlyAdded .content").scrollLeft(0);
					previous.focus();
				} else {
					previous.focus();
				}
			}
			
			// Right Arrow - Quick Select
			if (event.which == 39) {
				event.preventDefault();
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
	});
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
	
	if (localStorage.getItem(this.PLEX_OPTIONS_PREFIX + "debug") == "1") {
		$("#options a#optionDebugDetails i").removeClass("unchecked");
		$("#options a#optionDebugDetails i").addClass("check");	
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
	
	$("#options a#optionDebugDetails").click(function(event) {
		event.preventDefault();
		self.setCheckOption(this, self.PLEX_OPTIONS_PREFIX + "debug");		
	});
	
	$("#options a").keydown(function(event) {
		
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
	
	$("#settingsMessage").text("");
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
			$("#settingsMessage").text("Remove 'http://' from the server address!");
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
			ip = "192.168.0.3";
		}
		
		self.showLoader("Scanning");
		$("#settingsMessage").text("");
		$("#settingsMessage").show();
		self.plex.scanNetwork(ip, function(xml) {
			self.scanFoundCount++;
			$("#pms").val(this.url.substr(this.url.indexOf("://")+3));
			servers.push($(xml).find("MediaContainer:first").attr("friendlyName") + "|" + this.url);
			$("#settingsMessage").text("PMS found at: " + this.url + " " + $(xml).find("MediaContainer:first").attr("friendlyName"));
			$("#settingsMessage").fadeOut(3000);
			self.showLoader("PMS found");
		},function() {
			self.scanErrorCount++;
			if (self.scanErrorCount >= 255) {
				$("#settingsMessage").text("PMS not found on local network!");
				$("#settingsMessage").fadeOut(3000);
				self.showLoader("Error");
			}					
		},function(xml) {
			localStorage.setItem(self.PLEX_SERVER_LIST, servers.unique().join(","));
			
			if (servers.unique().length > 1) {	
				$("#settingsMessage").text("Multiple instances of PMS found.");
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
		
		if (device.getLocalTime) {
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
		} else {
			var now = new Date();
			$("#clock").text(now.toLocaleTimeString());
		}
	
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
	if (window.NetCastExit) {
		window.NetCastExit();
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