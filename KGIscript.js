'use strict';
var currentVersion = '4.4.4';
/*contents 
    #shims etc
    #All Pages
    #Home Page
    #Item Pages
    #Collection Pages
*/

/*----------#shims etc------------------*

/**
 * NodeList.prototype.forEach() polyfill
 * https://developer.mozilla.org/en-US/docs/Web/API/NodeList/forEach#Polyfill
 */

    
if (window.NodeList && !NodeList.prototype.forEach) { //make NodeList available in browsers that don't support it 
	NodeList.prototype.forEach = function (callback, thisArg) {
		thisArg = thisArg || window;
		for (var i = 0; i < this.length; i++) {
			callback.call(thisArg, this[i], i, this);
		}
	};
}
(function () { //begin namespace
	
	console.log('KGIscript v '+currentVersion); 
	/*--------------- All Pages -------------------------------------------------*/

	function changeLogoLink() {
		//make logo redirect to Library Home Page
		var headerLogo = document.querySelector('div.Header-logoHolder>div>a');
		var newUrl = 'https://library.ks.gov';
		headerLogo.href = newUrl;
		headerLogo.title = 'click to return to the State Library of Kansas';
		headerLogo.addEventListener('click', function (e) {
			this.href = newUrl;
			e.stopPropagation();
		});
	}

	document.addEventListener('cdm-home-page:ready', changeLogoLink);
	document.addEventListener('cdm-about-page:ready', changeLogoLink);
	document.addEventListener('cdm-login-page:ready', changeLogoLink);
	document.addEventListener('cdm-search-page:ready', changeLogoLink);
	document.addEventListener('cdm-collection-page:ready', changeLogoLink);
	document.addEventListener('cdm-advanced-search-page:ready', changeLogoLink);
	document.addEventListener('cdm-item-page:ready', changeLogoLink);
	document.addEventListener('cdm-custom-page:ready', changeLogoLink);

	function fauxAPI(url) {
		//ersatz document handling interface for html/php files
		return new Promise(function (resolve) {
			var secUrl = url.replace('http://', 'https://'); //make sure all links are secure or fetch won't work
			fetch(secUrl).then(function (response) {
				// When the page is loaded convert it to text
				return response.text();
			}).then(function (html) {
				// Initialize the DOM parser
				var parser = new DOMParser();
				// Parse the text
				resolve(parser.parseFromString(html, "text/html"));
				//grab only the parts we need for our display
			});
		});
	}

	/*------------ #Home Page-----------------------------------------------------------*/
	document.addEventListener('cdm-home-page:ready', function () {
		//for custom home page folders
		//enable expand and collapse buttons for folders
		document.querySelectorAll('.expandAll').forEach(function(item){
            item.addEventListener('click', expandAll);
        });
		document.querySelectorAll('.collapseAll').forEach(function(item){
            item.addEventListener('click', collapseAll);
        });
		var agencyNames = document.querySelectorAll('.agency-name a');
	
        
        function openFolder(e) {
            var targ = e.target.parentNode;
           targ.classList.toggle('open');
            
        }
        var items = document.querySelectorAll('.agency-name');
        items.forEach(function(item) {
            item.addEventListener('click', function(event) {
                openFolder(event)
                });
            });


    }); //end home-page event

	function expandAll(e) {
		var thisBox = e.srcElement.parentNode;
        thisBox.querySelectorAll('.agency-container').forEach(function (item) {
			item.classList.add('open');
		});
	};
    
    function collapseAll(e) {
		var thisBox = e.srcElement.parentNode;
        thisBox.querySelectorAll('.agency-container').forEach(function (item) {
			item.classList.remove('open');
		});
	}

	/*------------- #Item pages -------------------------------------------------------*/

	document.addEventListener('cdm-item-page:ready', itemPage); //end item-page event listener
    document.addEventListener('cdm-item-page:update', itemPage);
	
    
    function itemPage() {
		
        gPageEmbed();
		setTimeout(metaCleanUp, 1000); //kludged with a timer to get around react events that fire after cdm-item-page:ready 
		expandButtonExpand();
		
	} //end itemPage() 
	
	function gPageEmbed() {
			//embed G Page content for custom records on item record page
		var itemPreview = document.querySelector('.ItemPreview-container .preview');
		var theLink = document.querySelector('.ItemUrl-itemUrlLink a');
		if (theLink && theLink.href.match('G_Pages')) { //if the record has an old-model php page set up, crawl that page and replace link with iframe
			
			console.log('Old-model G Page');
			
			fauxAPI(theLink.href).then(function (html) {
				return html.querySelector('iframe').src;
			}).then(function (val) {

				var theFrame = '<iframe class="g-drive-display" src="' + val + '"></iframe>';
				return itemPreview.innerHTML = theFrame;
			});
			
		} else if (theLink && theLink.href.match('embeddedfolderview')) { //if record links directly to Google Drive, replace link with iframe
			
			console.log('Newer Model G Page');
			
			var theFrame = '<iframe class="g-drive-display" src="' + theLink.href + '"></iframe>';
			itemPreview.innerHTML = theFrame;
		}
        
    
		
	} //end gPageEmbed
	
	function metaCleanUp() { 
		
		
		
		var fieldValues = document.querySelectorAll('td.field-value > span'); //find all field values, return a NodeList of top-level spans
		
		fieldValues.forEach(function(theValue) { //loop of loops
			if (theValue.childElementCount > 0) { //if 1 -- now we need to determine if the span in question has any highlights - ie spans inside it
				var eachSpan = theValue.children;
				for (var i = 0; i < eachSpan.length; i++) { //for loop 1.1 -- if we have highlights, only change within them
						var theText = eachSpan[i].textContent
						if ( theText.match('<br>') ) { //if 1.1 --only fix the broken ones
							
							eachSpan[i].innerHTML = theText;
						}
					} //end for loop 1.1
			
				
			} //end if 1
			else { //else1 -- no highlights, cleanup the values in place 
				var theText = theValue.textContent;
				if ( theText.match('<br>') ) { // if 1.2 --only fix the broken ones again
					theValue.innerHTML = theText;
					
				} //end if 1.2
				
			} //end else1
				
				
		}); //end loop of loops

		
	} //end metaCleanUp
	
	function expandButtonExpand() {
		
		
		var theButton = document.querySelector('.ItemPDF-itemImage button');
			if (theButton) { 
				var expander = theButton.querySelector('.fa');

				theButton.classList = "expanderButton";
				expander.classList.add('ItemPDF-expandButton', 'cdm-btn','btn','btn-primary');
			} 
		
	} //end expandButtonExpand

 

	/*-------------- #Collection Pages ------------------------------------------------------*/

	document.addEventListener('cdm-collection-landing-page:ready', function (e) {

		//grab formatted list of agency pubs from static file
		var theID = e.detail.collectionId; //grab collection id from the current page
		var targetContainer = document.querySelector('.CollectionLanding-maincontentLanding');
		fauxAPI('/customizations/global/home.html').then(function (html) {
			return html.querySelector('#' + theID + ' .agency-docs').innerHTML;
		}).then(function (value) {
			targetContainer.insertAdjacentHTML('beforeend', '<div class="publications"><h1>Agency Publications in KGI</h1>' + value + '</div>');
		});
	}); //end collection landing page event	

})(); //end namespace
