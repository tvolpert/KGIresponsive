'use strict';
var currentVersion = '4.2.0';
/*contents 
    #shims etc
    #All Pages
    #Custom Pages
    #Item Pages
    #Collection Pages
*/
/* To Do:
*/
/*----------#shims etc------------------*

/**
 * NodeList.prototype.forEach() polyfill
 * https://developer.mozilla.org/en-US/docs/Web/API/NodeList/forEach#Polyfill
 */

    
if (window.NodeList && !NodeList.prototype.forEach) { //make NodeList available in browsers that don't support it ( i think)
	NodeList.prototype.forEach = function (callback, thisArg) {
		thisArg = thisArg || window;
		for (var i = 0; i < this.length; i++) {
			callback.call(thisArg, this[i], i, this);
		}
	};
}
(function () {
	
	console.log('KGIscript v '+currentVersion);
	/*--------------- All Pages -------------------------------------------------*/

	function changeLogoLink() {
		//make logo redirect to Library Home Page
		var headerLogo = document.querySelector('div.Header-logoHolder>div>a');
		var newUrl = 'https://kslib.info';
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

	/*------------ #Custom Pages -----------------------------------------------------------*/
	document.addEventListener('cdm-custom-page:ready', function () {
		//for custom home page folders
		//enable expand and collapse buttons for folders
		document.querySelectorAll('.expandAll').forEach(function(item){
            item.addEventListener('click', expandAll);
        });
		document.querySelectorAll('.collapseAll').forEach(function(item){
            item.addEventListener('click', collapseAll);
        });
		var agencyNames = document.querySelectorAll('.agency-name a');
		/* probably delete this?  agencyNames.forEach(function (item) {
			item.addEventListener('click', function (event) {
				click2OpensCollection(event);
			});
		}); */
        
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


    }); //end custom-page event

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

	/* function click2OpensCollection(e) {
		//make the second click on an agency name go to the agency page
		var theLink = e.currentTarget.href;
		var hash = window.location.hash;
		var collID = window.location.hash.replace('#', '');
		if (window.location.hash != '' && theLink.includes(hash)) {
			e.preventDefault();
			window.location = 'collection/' + collID;
		}
	} */

	/*------------- #Item pages -------------------------------------------------------*/

	document.addEventListener('cdm-item-page:ready', function () {
        console.log('ready event fired');
		// extract broken html from metadata fields, reinsert to fix formatting 
		var metaData = document.querySelectorAll('.ItemMetadata-metadatarow td span');
		metaData.forEach(function (item) {
			var text = item.textContent;item.innerHTML = text;
		});

		//embed G Page content for custom records on item record page
		var itemPreview = document.querySelector('.ItemPreview-container .preview');
		var theLink = document.querySelector('.ItemUrl-itemUrlLink a');
		if (theLink && theLink.href.match('G_Pages')) { //if the record has an old-model php page set up, crawl that page and replace link with iframe
			fauxAPI(theLink.href).then(function (html) {
				return html.querySelector('iframe').src;
			}).then(function (val) {

				var frame = '<iframe class="g-drive-display" src="' + val + '"></iframe>';
				return itemPreview.innerHTML = frame;
			});
		} else if (theLink && theLink.href.match('embeddedfolderview')) { //if record links directly to Google Drive, replace link with iframe
			var frame = '<iframe class="g-drive-display" src="' + theLink.href + '"></iframe>';
			itemPreview.innerHTML = frame;
		}
        var img = document.querySelector('.ItemPDF-itemImage img');
        img.onload = fullPageExpandButton;
        function fullPageExpandButton(){
            console.log('expand deployed');
            var button = document.querySelector('.ItemPDF-itemImage button'),
                expander = button.querySelector('.fa');

            button.setAttribute('style', 'width:'+img.width+'px;height:'+img.height+'px;top:0;left:0;background-color:unset;');
            expander.classList.add('ItemPDF-expandButton','btn','btn-primary');
        }
    }); //end item-page event listener
    

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
