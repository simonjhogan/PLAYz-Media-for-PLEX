/**
PLEX for LG Media Center

Copyright 2014 Simon J. Hogan (Sith'ari Consulting)

Licensed under the Apache License, Version 2.0 (the "License"); you may not use this 
file except in compliance with the License. You may obtain a copy of the License at

http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under 
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, 
either express or implied. See the License for the specific language governing permissions 
and limitations under the License.
**/

var settings;
var language;

function languageInit(callback, languageDefault)
{
	language = languageDefault ? languageDefault : $.querystring().language;
	var device = document.getElementById("device");	
	
	if (!language) {
		if (device.tvLanguage2) {
			language = device.tvLanguage2.indexOf("-") > -1 ? device.tvLanguage2.substr(0, 2) : device.tvLanguage2;
		} else if (navigator.language) {
			language = navigator.language.indexOf("-") > -1 ? navigator.language.substr(0, 2) : navigator.language;
		} else {
			language = "en";
		}
	}
	
	console.log(language);
	
	$.getJSON("./system/language/" + language + ".json", function(data) {
		
		settings = data;
		
		if (language != "en") {
			$("[data-language]").each(function() {
				$(this).html(data.language[$(this).data("language")]);
			});
			  
			$("[data-language-title]").each(function() {
				$(this).attr("title", data.language[$(this).data("languageTitle")]);
			});	
		}
		
		callback();
	}).fail(function(jqxhr, textStatus, error ) {
		console.log(language + " " + error);
		languageInit(callback, "en");
	});	
}