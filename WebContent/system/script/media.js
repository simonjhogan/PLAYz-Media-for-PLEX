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

function Media()
{
	this.PLEX_OPTIONS_PREFIX = "plexOptions-";	
	this.PLEX_CURRENT_PREFIX = "plexSelected-";
	this.PLEX_LAST_VIEW_PREFIX = "plexLastView-";
	this.PLEX_CURRENT_PAGE_PREFIX = "plexStartView-"
	
	this.PLEX_VIEW_MODE = "plexViewMode";	
	this.menuBarWidth = "60px";	
	this.menuFlag = false;
	this.titleScroll;
	
	this.viewStart = 0;
	this.viewTotal = 0;
	this.viewCurrent = 0;

	if (localStorage.getItem(this.PLEX_OPTIONS_PREFIX + "allItems") == "1") {
	    this.viewSize = 1000000; // number of items per page, basically unlimited	    
	} else {
	    this.viewSize = 80; // number of items per page
	}
	
		
};

Media.prototype.initialise = function()
{
	var self = this;
	this.plex = new PLEX();
	this.cache = "";
	this.section = $.querystring().section;
	this.key = $.querystring().key;
	
	this.filter = localStorage.getItem(this.PLEX_LAST_VIEW_PREFIX + this.key) ? localStorage.getItem(this.PLEX_LAST_VIEW_PREFIX + this.key) : "all";	
	this.filter = $.querystring().filter ? $.querystring().filter : this.filter;
	this.filterKey = $.querystring().filterkey;	
	this.query = $.querystring().query;
	this.viewStart = parseInt(localStorage.getItem(this.PLEX_CURRENT_PAGE_PREFIX + this.key)) || this.viewStart;
	
	$("#menu a").tooltipster({position: "right"});
	$("#menuFilterView a").tooltipster();
	
	//Enable page loading icon
	if (window.NetCastSetPageLoadingIcon) {
	    window.NetCastSetPageLoadingIcon('enabled');
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
		this.setDebug();		
	}
	
	$(document).keydown(function(event) {
		switch (event.which) {
			case 461:
			case 27:
				event.preventDefault();
				self.clearDefaults();
				history.back(1);
				break;
								
			case 33:
		    case 403:
      
                	self.plex.panic();
		        break;
			case 412: //Prev page
				self.prevPage();
				break;
				
			case 34:
			case 406:
			case 417: //Next Page
				self.nextPage();
				break;	
		}	
	});
	
	$("#menu a").hover(function() {
		$(this).focus();
	});

	$("#menu a").keydown(function(event) {
		
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
			if (self.menuFlag) {
				$("#menuFilterContent a:first").focus();
			}
			event.preventDefault();
		}
		
		// Right Arrow
		if (event.which == 39) {
			if ($(this).data("keyRight")) {
				$($(this).data("keyRight")).focus();
				if (self.menuFlag) {
					self.hideMenu();
				}
				event.preventDefault();
			}
		}		
	});	
	
	switch($.querystring().action) {
		case "view":
		    	if (this.section == "channels" || this.section == "playlists") {
				$("#filter").hide();
			} else {
				this.loadMenu(this.section, this.key);
			}
			this.view(this.section, this.key, this.filter, this.filterKey, this.viewStart);	
			break;
			
		case "search":
			$("#filter").hide();
			this.view(this.section, this.key, "search", this.query, this.viewStart);		
			break;			
	}
};

Media.prototype.toggleMenu = function()
{
	if (this.menuFlag) {
		this.hideMenu();
	} else {
		this.showMenu();
	}	
};

Media.prototype.showMenu = function()
{
	$("#menuBar").css("width", "270px");
	$("#menuFilter").fadeIn();	
	this.menuFlag = true;
	$("#menuFilterContent a:first").focus();	
};

Media.prototype.hideMenu = function()
{
	$("#menuBar").css("width", this.menuBarWidth);
	$("#menuFilter").hide();	
	this.menuFlag = false;	
};

Media.prototype.clearDefaults = function()
{
	localStorage.removeItem(self.PLEX_CURRENT_PREFIX + self.key);
	localStorage.removeItem(this.PLEX_CURRENT_PAGE_PREFIX + this.key);
};


Media.prototype.nextPage = function()
{
	if (this.viewStart+this.viewSize+1 <= this.viewTotal) {
		localStorage.removeItem(self.PLEX_CURRENT_PREFIX + self.key);
		this.viewStart = this.viewStart+this.viewSize+1;
		
		//console.log(this.viewStart + ":" + this.viewSize);
		
		switch($.querystring().action) {
			case "view":
			    	if (this.section == "channels" || this.section == "playlists") {
					$("#filter").hide();
				} else {
					this.loadMenu(this.section, this.key);
				}
				this.view(this.section, this.key, this.filter, this.filterKey, this.viewStart);	
				break;
				
			case "search":
				$("#filter").hide();
				this.view(this.section, this.key, "search", this.query, this.viewStart);		
				break;			
		}
	}
};

Media.prototype.prevPage = function()
{
	if (this.viewStart-this.viewSize-1 >= 0) {
		localStorage.removeItem(self.PLEX_CURRENT_PREFIX + self.key);
		this.viewStart = this.viewStart-this.viewSize-1;

		//console.log(this.viewStart + ":" + this.viewSize);
					
		switch($.querystring().action) {
			case "view":
				if (this.section == "channels" || this.section == "playlists") {
					$("#filter").hide();
				} else {
					this.loadMenu(this.section, this.key);
				}
				this.view(this.section, this.key, this.filter, this.filterKey, this.viewStart);	
				break;
				
			case "search":
				$("#filter").hide();
				this.view(this.section, this.key, "search", this.query, this.viewStart);		
				break;			
		}
	}
};

Media.prototype.loadMenu = function(section, key)
{
	var i = 0;
	var self = this;
	this.showLoader("Loading");
	
	$("#menuFilterContent ul").empty();
	
	this.plex.getSectionDetails(key, function(xml) {
		//Set title
		$("#applicationWallpaper").css("background-image", "url(" + self.plex.getTranscodedPath($(xml).find("MediaContainer:first").attr("art"), 1280, 720) + ")");
		
		// Populate section filters
		$("#menuFilterContent ul").empty();
		$("#menuFilterContent ul").append("<li class=\"heading\">Views</li>");
		$(xml).find("Directory[search!='1'][secondary!='1']").each(function(index, item) {
			html = "<li><a href data-key-index=\"" + i++ + "\" data-action=\"view\" data-section=\"" + self.section + "\" data-key=\"" + self.key + "\" data-filter=\"" + $(this).attr("key") + "\">" + $(this).attr("title").replace("By ", "") + "</a></li>";
			$("#menuFilterContent ul").append(html);
		});

		$("#menuFilterContent ul").append("<li class=\"heading\">Filters</li>");
		$(xml).find("Directory[secondary='1']").each(function(index, item) {
			html = "<li><a href data-key-index=\"" + i++ + "\" data-action=\"view\" data-section=\"" + self.section + "\" data-key=\"" + self.key + "\" data-filter=\"" + $(this).attr("key") + "\">" + $(this).attr("title").replace("By ", "") + "</a></li>";			$("#menuFilterContent ul").append(html);
		});
		
		//$("#menuFilterContent a, #menuFilterView a").off();
		
		$("#menuFilterContent a, #menuFilterView a").hover(function() {
			$(this).focus();
		});

		$("#menuFilterView a").keydown(function(event) {
			
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
		
		$("#thumbsView").click(function() {
			localStorage.setItem(self.PLEX_VIEW_MODE, "thumbs");
			self.view(self.section, self.key, self.filter, self.filterKey, self.viewStart);	
			self.hideMenu();
			event.preventDefault();
		});

		$("#listView").click(function() {
			localStorage.setItem(self.PLEX_VIEW_MODE, "list");
			self.view(self.section, self.key, self.filter, self.filterKey, self.viewStart);
			self.hideMenu();
			event.preventDefault();
		});
		
		$("#menuFilterContent a").click(function(event) {
			self.filter = $(this).data("filter");
			localStorage.setItem(self.PLEX_LAST_VIEW_PREFIX + $(this).data("key"), $(this).data("filter"));
			self.clearDefaults(); 
			self.filterKey = "";
			self.view($(this).data("section"), $(this).data("key"), $(this).data("filter"), self.filterKey, 0);
			self.hideMenu();
			event.preventDefault();
		});
		
		$("#menuFilterContent a").keydown(function(event) {
			var index = $(this).data("keyIndex");
			var up = $(this).parents("#menuFilterContent").find("li a[data-key-index='" + (Number(index)-1) + "']");
			if ((Number(index)-1) < 0) {
				up = $("#menuFilterView a:first");
			}			
			var down = $(this).parents("#menuFilterContent").find("li a[data-key-index='" + (Number(index)+1) + "']");
			
			// Up Arrow		
			if (event.which == 38) {
				event.preventDefault();
				up.focus();
			}
			
			// Down Arrow
			if (event.which == 40) {
				event.preventDefault();
				down.focus();
			}
			
			// Left Arrow
			if (event.which == 37) {
				event.preventDefault();
				if (self.menuFlag) {
					self.hideMenu();
					$("#mediaView a:first").focus();
				}					
			}
			
			// Right Arrow
			if (event.which == 39) {
				event.preventDefault();
				$("#filter").focus();			
			}		
		});	
		
	});	
};

Media.prototype.view = function(section, key, filter, filterKey, start)	
{
	this.rowCount = 0;
	this.viewStart = start;
	var options = {"start": start,"size":this.viewSize};
	
	var self = this;
	this.showLoader("Loading");
	$("#mediaViewContent ul").empty();
	
	if (section == "playlists" || section == "channels") {
	    filter = "all";
	}

	//console.log(key + " " + filter + " " + filterKey);
	
	// Load section content	
	self.plex.getSectionMedia(section, key, filter, filterKey, function (xml) {

		var $container = $(xml).find("MediaContainer:first");
		$("#title").stop(true, true);
		$("#title").show();
		self.viewTotal = $(xml).find("MediaContainer:first").attr("totalSize");

		//console.log("Start: " + start);		
		//console.log("Total: " + self.viewTotal);
		//console.log("Filter: " + filter);
		//console.log(self.viewTotal + " - " + self.viewSize + " - " + (self.viewTotal/self.viewSize));
		
		var totalPages = Math.ceil(self.viewTotal/self.viewSize);
		var page = "<br/>Page " + (Math.round(start/self.viewSize+1)) + " of " + totalPages;
		
		switch(filter) {
			case "all":
				if (section == "channels") {
					$("#title").html("Channels");
				} else if (section == "playlists") {
				    $("#title").html("Playlists");
				} else {
					$("#title").html($container.attr("title2") + page);
				}
				break;

			case "search":
				if (filterKey.indexOf("%") > -1) {
					$("#title").html("Search Results" + page);
				} else {
					$("#title").html("Results for \"" + filterKey + "\"" + page);
				}
				break;
				
			default:
				$("#title").html($container.attr("title1") + " - " + $container.attr("title2") + page);
				break;
		}
		var shouldShowInSearch = true;

			$(xml).find("Directory,Video,Photo,Artist,Track,Playlist").each(function (index, item) {

			    if (shouldShowInSearch && (self.plex.getShouldShowHiddenFiles() || (!self.plex.isMarkedAsHidden(item, "title") && !self.plex.isTreeContainsHiddenFiles(item, filter)))) { //will enter here for every type of content! ehowever we change inside if its playlist. in the future we can expand it to channels or to remove the branching all otgether and check everything, meanig the we could set individual movies to private

		            var mediaType;
		            var art;
		            var thumb;
		            var actualKey;
		            thumb = $(this).attr("thumb");
		            art = $(this).attr("art");
		            actualKey = $(this).attr("key");

		            switch (section) {
		                case "playlists":
		                    if (key == "playlists") {
		                        mediaType = "playlist";
		                        thumb = $(this).attr("composite");
		                        actualKey = $(this).attr("ratingKey");
		                    } else { //behave like any other media, since we handle the actual items in the playlist now and not the playlist itself
		                        mediaType = $(this).attr("type");
		                    }

		                    break;
		                case "channels":
		                    if (key == "channels") {
		                        mediaType = "channel";
		                    } else { //behave like any other media, since we handle the actual items in the playlist now and not the playlist itself
		                        mediaType = $(this).attr("type");
		                    }
		                    break;
		                default:
		                    mediaType = $(this).attr("type");
		                    break;
		            }
                    

		            if (localStorage.getItem(self.PLEX_VIEW_MODE) == "list") {
		                html = self.plex.getListHtml(index, self.plex.removeHiddenToken($(this).attr("title")), self.section, mediaType, actualKey,
                            {
                                "artist": $(this).attr("parentTitle"),
                                "art": art,
                                "series": $(this).attr("grandparentTitle"),
                                "season": $(this).attr("parentIndex"),
                                "episode": $(this).attr("index"),
                                "index": $(this).attr("index"),
                                "year": $(this).attr("year"),
                                "parentKey": $(this).attr("parentKey"),
                                "media": $(this).find("Media Part:first").attr("key"),
                                "lastViewedAt": $(this).attr("lastViewedAt"),
                                "viewOffset": $(this).attr("viewOffset"),
                                "viewCount": $(this).attr("viewCount"),
                                "leafCount": $(this).attr("leafCount"),
                                "viewedLeafCount": $(this).attr("viewedLeafCount"),
                                "filter": self.filter,
                                "sectionKey": actualKey,
                                "section": mediaType
                            });
		            } else {
		                html = self.plex.getThumbHtml(index, self.plex.removeHiddenToken($(this).attr("title")), self.section, mediaType, actualKey,
                            {
                                "thumb": thumb,
                                "parentThumb": $(this).attr("parentThumb"),
                                "grandparentThumb": $(this).attr("grandparentThumb"),
                                "art": art,
                                "artist": $(this).attr("parentTitle"),
                                "series": $(this).attr("grandparentTitle"),
                                "season": $(this).attr("parentIndex"),
                                "episode": $(this).attr("index"),
                                "index": $(this).attr("index"),
                                "parentKey": $(this).attr("parentKey"),
                                "media": $(this).find("Media Part:first").attr("key"),
                                "lastViewedAt": $(this).attr("lastViewedAt"),
                                "viewOffset": $(this).attr("viewOffset"),
                                "viewCount": $(this).attr("viewCount"),
                                "leafCount": $(this).attr("leafCount"),
                                "viewedLeafCount": $(this).attr("viewedLeafCount"),
                                "filter": self.filter,
                                "sectionKey": actualKey,
                                "containerArt": $(xml).find("MediaContainer:first").attr("art"),
                                "containerThumb": $(xml).find("MediaContainer:first").attr("thumb"),
                                "section": mediaType
                            });
		            }
		            $("#mediaViewContent ul").append(html);
		    }
		});
		
		$(".thumb").lazyload({
			placeholder: 'system/images/poster.png',
			container: $("#mediaViewContent")
		});
		
		$("#title").fadeOut(8000);
		self.rowCount = self.getRowCount("#mediaViewContent ul li");	

		//console.log(self.rowCount);

		$("#mediaViewContent a").focus(function(event) {
			var item = $(this);
			var left = 0;
			localStorage.setItem(self.PLEX_CURRENT_PREFIX + self.key, $(this).data("key"));
			localStorage.setItem(self.PLEX_CURRENT_PAGE_PREFIX + self.key, self.viewStart);
			
			if (localStorage.getItem(self.PLEX_OPTIONS_PREFIX + "hoverBackdrop") == "1") {
				$("#applicationWallpaper").css("background-image", "url(" + self.plex.getTranscodedPath($(this).data("art"), 1280, 720) + ")");
			}
		
			if (item.find(".subtitle").length > 0) {
				clearInterval(self.titleScroll);
				self.titleScroll = setInterval(function() {
					item.find(".subtitle").css("textOverflow", "clip");
					clearInterval(self.titleScroll);
					self.titleScroll = setInterval(function() {
						if (left <= item.find(".subtitle")[0].scrollWidth) {
							item.find(".subtitle").scrollLeft(left+=2);
						} else {
							clearInterval(self.titleScroll);	
						}
					}, 50);
				},1000);
			}
		});

		$("#mediaViewContent a").blur(function(event) {
			clearInterval(self.titleScroll);	
			$(this).find(".subtitle").scrollLeft(0);
			$(this).find(".subtitle").css("textOverflow", "ellipsis");
		});
						
		$("#mediaViewContent a").mouseenter(function(event) {
			$(this).focus();
		});

		$("#mediaViewContent a").click(function(event) {
			event.preventDefault();
			self.showLoader("Loading");
			if ($(this).is("[data-filter]")) {
				url = "./media.html?action=view&section=" + self.section + "&key=" + $(this).data("sectionKey") + "&filter=" + self.filter + "&filterkey=" + encodeURIComponent($(this).data("key"));
			} else {
			    switch (self.section) {
			        case "playlists":
			            if (key == "playlists") {
			                url = "media.html?action=view&section=" + self.section + "&key=" + $(this).data("sectionKey");
			            } else {
			                url = "./item.html?action=preview&section=" + $(this).data("section") + "&sectionKey=" + $(this).data("sectionKey") + "&key=" + encodeURIComponent($(this).data("key"));
			            }
			            break;
			        case "channels":
			            if ($(this).data("mediaType") != "channel") {
			                url = "./item.html?action=preview&section=" + $(this).data("section") + "&sectionKey=" + $(this).data("sectionKey") + "&key=" + encodeURIComponent($(this).data("key")) + "&debug=" + $(this).data("mediaType");
			            } else {
			                url = "media.html?action=view&section=" + self.section + "&key=" + $(this).data("sectionKey") + "&debug=" + $(this).data("mediaType");
			            }
			            break;
			        default:
			            url = "./item.html?action=preview&section=" + self.section + "&sectionKey=" + $(this).data("sectionKey") + "&key=" + encodeURIComponent($(this).data("key"));
			            break;
			    }
			}
			$(this).attr("href", url);
			location.href = url;
		});

		// Handle Arrow Key Navigation
		$("#mediaViewContent a").keydown(function(event) {
			var index = $(this).data("key-index");
			//console.log(Number(index) + " -- " + self.rowCount);
			var left = (Number(index)%self.rowCount == 0) ? $("#back") : $(this).parents("#mediaView").find("li a[data-key-index='" + (Number(index)-1) + "']");
			var right = $(this).parents("#mediaView").find("li a[data-key-index='" + (Number(index)+1) + "']");
			var up = $(this).parents("#mediaView").find("li a[data-key-index='" + (Number(index)-self.rowCount) + "']");
			var down = $(this).parents("#mediaView").find("li a[data-key-index='" + (Number(index)+self.rowCount) + "']");
			
			// Up Arrow		
			if (event.which == 38) {
				event.preventDefault();
				up.focus();
			}
			
			// Down Arrow
			if (event.which == 40) {
				event.preventDefault();
				down.focus();
			}
			
			// Left Arrow
			if (event.which == 37) {
				event.preventDefault();
				left.focus();
			}
			
			// Right Arrow
			if (event.which == 39) {
				event.preventDefault();
				right.focus();
			}
			
			// Play Button
			if (event.which == 415 || event.which == 80) {
				event.preventDefault();
				if ($(this).data("media") && $(this).data("media") != "undefined") {
					self.showLoader("Loading");
					location.href = "player.html?key=" + $(this).data("key") + "&autoplay=true";				
				}
			}	
	
		});
		
		
		if (localStorage.getItem(self.PLEX_CURRENT_PREFIX + self.key) && $("#mediaView li a[data-key='" + localStorage.getItem(self.PLEX_CURRENT_PREFIX + self.key) + "']:first").length > 0) {
			$("#mediaView li a[data-key='" + localStorage.getItem(self.PLEX_CURRENT_PREFIX + self.key) + "']:first").focus();
		} else {
			if ($("#mediaView li a").length > 0) {
				if ($("#next:focus").length == 0 && $("#prev:focus").length == 0) {
					$("#mediaView li a:first").focus();
				}
			} else {
				$("#mediaViewContent ul").html("<p class=\"centered\">Empty view</p");
				$("#back").focus();	
			}
		}
		self.hideLoader();
	}, options);
};	

Media.prototype.showLoader = function(message)
{
	$("#message").text(message);
	$("#loader").show();
};

Media.prototype.hideLoader = function()
{
	$("#loader").hide();
};

Media.prototype.getRowCount = function(query) {
    var row = 0;
    $(query).each(function() {
        if($(this).prev().length > 0) {
            if($(this).position().top != $(this).prev().position().top) return false;
            row++;
        } else {
            row++;   
        }
    });
    return row;
};

Media.prototype.setDebug = function()
{
	var self = this;
	var device = document.getElementById("device");

	if (self.debug) {
		if (window.NetCastGetUsedMemorySize) {
			$("#debugMemory").text(window.NetCastGetUsedMemorySize());		
		}
	}	
	
	timer = setTimeout(function(){self.setDebug();}, 500);
};
