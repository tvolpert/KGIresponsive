(function() { //begin namespace

//#AgencyList generate list of agency documents on each agency landing page {
	var collID; 
	var listResults = '<div id="pub-list"><h1>Agency Publications in KGI</h1><ul class="agency-pubs">';
	var resultTarget;
	var recURL;
	document.addEventListener('cdm-collection-landing-page:ready', function(e){
			collID = e.detail.collectionId; //grab collection id from the current page
			fetch('https://cdm16884.contentdm.oclc.org/digital/api/search/collection/'+collID)
		.then(function(response) {
		return response.json();
	  }) //end .then
	  .then(function(data) {
		  for (i = 0 ; i < data.items.length; i++) { //begin loop
		  var regex = /\/singleitem/;
		  recURL = data.items[i].itemLink.split(regex)[1];
		  listResults += '<li><a href="/digital'+recURL+'">'+data.items[i].title+'</a></li>'
	   } //end loop
	
		  resultTarget = document.querySelector('.CollectionLanding-maincontentLanding');
		resultTarget.innerHTML += listResults+'</ul></div>';
		}) //end .then
	 
	}); //end :ready event listener

// } end #AgencyList



})(); //end namespace