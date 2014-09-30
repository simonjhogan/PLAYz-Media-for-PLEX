/*
** PLEX for LG Media Center
** Created by Simon J. Hogan
** Copyright 2013 h3consulting
** http://plex.h3consulting.net
**/

(function ($) {
    $.fn.progressbar = function (options) 
    {
        var settings = $.extend({
        width: '400px',
        height: '10px',
        color: '#ff9900',
        padding: '0px'},options);
  
		$(this).css({
			'width':settings.width,
			'border':settings.border
		});
        
        // add progress bar to container
        var progressbar =$("<div></div>");
        progressbar.css({
			'height': settings.height,
			'text-align': 'right',
			'vertical-align': 'middle',
			'color': 'transparent',
			'width': '0px',
			'background-color': settings.color
        });
 
        $(this).append(progressbar);
        
        this.setTitle = function(value)
        {
        	$(this).prop("title", value);
        };
        
        this.progress = function(value)
        {
            var width = $(this).width() * value/100;
            progressbar.width(width).html(value+"% ");
        };
        
        $(this).click(function(event) {
        	var parentOffset = $(this).offset();
        	var x = event.pageX - parentOffset.left;    	
			$.event.trigger({
				type: "progressClick",
				percent: (x/$(this).width()) * 100,
				pos: x					
			});	        	
        });
        
        return this;
    };
 
}(jQuery));