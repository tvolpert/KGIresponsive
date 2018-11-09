'use strict';

(function () {
	var currentVersh = 'kgiscript v3.1.6';
	console.log(currentVersh);
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

	/*------------ Home Page -----------------------------------------------------------*/
	document.addEventListener('cdm-custom-page:ready', function () {
		//for custom home page folders
		//enable expand and collapse buttons for folders
		document.querySelector('#expandAll').addEventListener('click', expandAll);
		document.querySelector('#collapseAll').addEventListener('click', collapseAll);
		var agencyNames = document.querySelectorAll('.agency-name');
		agencyNames.forEach(function (item) {
			item.addEventListener('click', function (event) {
				click2OpensCollection(event);
			});
		});
	}); //end custom-page event

	function expandAll() {
		var docLists = document.querySelectorAll('.agency-container');
		docLists.forEach(function (item) {
			item.classList.add('open');
		});
	};
	function collapseAll() {
		var docLists = document.querySelectorAll('.agency-container');
		docLists.forEach(function (item) {
			item.classList.remove('open');
			if (location.hash) {
				location.hash = '';
			}
		});
	}

	function click2OpensCollection(e) {
		//make the second click on an agency name go to the agency page
		var theLink = e.currentTarget.href;
		var hash = window.location.hash;
		var collID = window.location.hash.replace('#', '');
		if (window.location.hash != '' && theLink.includes(hash)) {
			e.preventDefault();
			window.location = 'collection/' + collID;
		}
	}

	/*------------- Item pages -------------------------------------------------------*/

	document.addEventListener('cdm-item-page:ready', function () {
		// extract broken html from metadata fields, reinsert to fix formatting 
		var metaData = document.querySelectorAll('.ItemMetadata-metadatarow td span');
		metaData.forEach(function (item) {
			var text = item.textContent;item.innerHTML = text;
		});

		//embed Gpage content on item record page
		var itemPreview = document.querySelector('.ItemPreview-container .preview');
		var theLink = document.querySelector('.ItemUrl-itemUrlLink a');
		if (theLink.href.match('G_Pages')) {
			fauxAPI(theLink.href).then(function (html) {
				return html.querySelector('iframe').src;
			}).then(function (val) {

				var frame = '<iframe class="g-drive-display" src="' + val + '"></iframe>';
				return itemPreview.innerHTML = frame;
			});
		} else if (theLink.href.match('embeddedfolderview')) {
			var frame = '<iframe class="g-drive-display" src="' + theLink.href + '"></iframe>';
			itemPreview.innerHTML = frame;
		}
	}); //end item-page event listener

	/*-------------- Collection Pages ------------------------------------------------------*/

	document.addEventListener('cdm-collection-landing-page:ready', function (e) {

		//grab formatted list of agency pubs from static file
		var theID = e.detail.collectionId; //grab collection id from the current page
		var targetContainer = document.querySelector('.CollectionLanding-maincontentLanding');
		fauxAPI('/customizations/global/pages/agencylist.html').then(function (html) {
			return html.querySelector('#' + theID + ' .agency-docs').innerHTML;
		}).then(function (value) {
			targetContainer.insertAdjacentHTML('beforeend', '<div class="publications"><h1>Agency Publications in KGI</h1>' + value + '</div>');
		});
	}); //end collection landing page event	

})(); //end namespace