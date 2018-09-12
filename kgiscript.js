(function() { //begin namespace
var listMeat;
document.addEventListener('cdm-app:ready', function(e) {

}); 
document.addEventListener('cdm-custom-page:ready', function(e){
	//populate home page with our layout:

	let regexp = /#agency-.+/;
	if (location.hash.match(regexp) ) { 
		//figure out a way to fetch and display list contents for ppl landing on a target
	};
			fetch('https://cdm16884.contentdm.oclc.org/digital/api/collections/all/simple')
		.then(function(response) {
		return response.json();
	  }) //end .then
	  .then(function(data) { 
		listMeat='<ul id="collection-list">';
		for (i = 0 ; i < data.length; i++) { //begin loop1 to populate list
			let agencyName = data[i].name;
			var theID = data[i].alias;
			listMeat += '<li class="agency-name" id="agency-'+theID+'"><a href="#agency-'+theID+'" id="'+theID+'">'+agencyName+'</a><ul class="agency-docs"></ul></li>';
	   } //end loop1
}) //end .then
	
	
.then(function() { //#AgencyList generate list of agencies/collections for front page
			let agencyList= document.querySelector('#agency-list');
	agencyList.innerHTML += listMeat+'</ul>';
	
	let indAgency = document.querySelectorAll('#collection-list li a');
	for (i=0; i < indAgency.length; i++) { //begin loop2 to add document links
	indAgency[i].addEventListener('click', function(event) { 
		getDocs(event);
	}) 
	}  //end loop2
	});



function getDocs(event) { //load and display doc list
  let theID = event.target.id;
  let theContainer = document.querySelector('#agency-'+theID);
  let theList = document.querySelector('#agency-'+theID+' .agency-docs');
  if (theList.innerHTML == '') { ; //#if1 check to make sure this list hasn't already been loaded
	event.preventDefault();
	theContainer.classList.add('loading');
	console.log('if!');
	fetch('https://cdm16884.contentdm.oclc.org/digital/api/search/collection/'+theID)
	.then(function(response) { //.then1
		return response.json();
	  }) //end .then1
	  .then (function(data) { //.then2
	
	  let listResults = '';
			  for (i = 0 ; i < data.items.length; i++) { //begin loop3
		  var regex = /\/singleitem/;
		  recURL = data.items[i].itemLink.split(regex)[1];
		  listResults += '<li><a href="/digital'+recURL+'">'+data.items[i].title+'</a></li>'
		} //end loop3
	   theList.innerHTML = listResults;
	   location.hash = '#agency-'+theID;
	   theContainer.classList.remove('loading');
	  }); //end .then2
} //end #if1
else {console.log('else!');}


}
//end #AgencyList
}); //end cdm-home-page:ready event

//#DocList generate list of agency documents on each agency landing page {
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
		  for (i = 0 ; i < data.items.length; i++) { //begin loop4
		  var regex = /\/singleitem/;
		  recURL = data.items[i].itemLink.split(regex)[1];
		  listResults += '<li><a href="/digital'+recURL+'">'+data.items[i].title+'</a></li>'
	   } //end loop4
	
		  resultTarget = document.querySelector('.CollectionLanding-maincontentLanding');
		resultTarget.innerHTML += listResults+'</ul></div>';
		}) //end .then
	 
	}); //end cdm-collection-landing-page:ready event listener

// } end #DocList



})(); //end namespace 