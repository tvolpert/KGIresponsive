
(function(){
	let currentVersh = 'kgiscript v3.1.1';
	console.log(currentVersh);
/*--------------- All Pages -------------------------------------------------*/

function changeLogoLink() { //make logo redirect to Library Home Page
    const headerLogo = document.querySelector('div.Header-logoHolder>div>a');
    const newUrl = 'https://kslib.info';
    headerLogo.href = newUrl;
	headerLogo.title = 'click to return to the State Library of Kansas';
    headerLogo.addEventListener('click', function(e) {
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
	
function fauxAPI(url){ //ersatz document handling interface for html/php files
	return new Promise((resolve) => {
		let secUrl = url.replace('http://', 'https://'); //make sure all links are secure or fetch won't work
		fetch(secUrl)
		.then((response) => {
		  // When the page is loaded convert it to text
		  return response.text()
		})
		.then((html) => {
					// Initialize the DOM parser
			let parser = new DOMParser();
			// Parse the text
			resolve(parser.parseFromString(html, "text/html") );
			//grab only the parts we need for our display
		});
	});
}
	
/*------------ Home Page -----------------------------------------------------------*/
	function expandAll() {
		let docLists = document.querySelectorAll('.agency-container');
		docLists.forEach(function(item) {
			item.classList.add('open');
		})
	};
	function collapseAll() {
		let docLists = document.querySelectorAll('.agency-container');
		docLists.forEach(function(item) {
			item.classList.remove('open');
			if (location.hash) {
				location.hash = '';
			}
		})
	}
	document.addEventListener('cdm-custom-page:ready', function() { //for custom home page folders
		document.querySelector('#expandAll').addEventListener('click', expandAll);
		document.querySelector('#collapseAll').addEventListener('click', collapseAll);
	}); //end custom-page event


/*------------- Item pages -------------------------------------------------------*/	

	document.addEventListener('cdm-item-page:ready', function() {
		// extract broken html from metadata fields, reinsert to fix formatting 
		let metaData = document.querySelectorAll('.ItemMetadata-metadatarow td span');
		metaData.forEach(function(item) { let text = item.textContent; item.innerHTML = text; } );
		
		//embed Gpage content on item record page
		let itemPreview = document.querySelector('.ItemPreview-container .preview');
		let theLink = document.querySelector('.ItemUrl-itemUrlLink a');
		if ( theLink.href.match('G_Pages') ) {
			fauxAPI(theLink.href)
			.then((html) => {
				return	html.querySelector('iframe').src
			}).then( (val) => {
			
				let frame= '<iframe class="g-drive-display" src="'+val+'"></iframe>'
				return itemPreview.innerHTML= frame
			})
		}
	
	}); //end item-page event listener
	
/*-------------- Collection Pages ------------------------------------------------------*/	

	document.addEventListener('cdm-collection-landing-page:ready', function(e){
		
		//grab formatted list of agency pubs from static file
		let theID = e.detail.collectionId; //grab collection id from the current page
		let targetContainer = document.querySelector('.CollectionLanding-maincontainer');
		fauxAPI('https://cdm16884.contentdm.oclc.org/customizations/global/pages/agencylist.html')
		.then((html) => {
			return html.querySelector('#'+theID).innerHTML
		}).then((value) => targetContainer.innerHTML += value );
		
		
	}); //end collection landing page event	


	
})(); //end namespace 