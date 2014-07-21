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