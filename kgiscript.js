let currentVersh = '3.0.1';
(function(){console.log('currentVersh');

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
	document.addEventListener('cdm-item-page:ready', function() {
		// extract broken html from metadata fields, reinsert to fix formatting 
		let metaData = document.querySelectorAll('.ItemMetadata-metadatarow td span');
		metaData.forEach(function(item) { let text = item.textContent; item.innerHTML = text; } );
		
	}); //end item-page event listener
	document.addEventListener('cdm-collection-landing-page:ready', function(e){
			theID = e.detail.collectionId; //grab collection id from the current page
		fetch('https://cdm16884.contentdm.oclc.org/digital/api/collections/'+theID)
		.then(function(response) { 
			return response.json();
		})
		.then(function(response) {
			console.log(response.pageText);
		});
	}); //end collection landing page event	

})();