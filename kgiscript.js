(function() { //begin namespace
document.addEventListener('cdm-custom-page:ready', function(e){
	console.log('ready!');
//#AgencyList generate list of agencies/collections for front page
var agencyList= document.querySelector('#agencyList');

	fetch('https://cdm16884.contentdm.oclc.org/digital/api/collections?startPage=1&count=999')
		.then(function(response) {
		return response.json();
	  }) //end .then
	  .then(function(data) {
	  let listMeat='<ul id="collection-list">';
		for (i = 0 ; i < data.cards.length; i++) { //begin loop1 to populate list
			let agencyName = data.cards[i].title;
			var theID = data.cards[i].alias;
			listMeat += '<li class="agencyName" ><a href="#agency-'+theID+'" id="'+theID+'">'+agencyName+'</a><ul id="agency-'+theID+'" class="agency-docs"></ul></li>';
	   } //end loop1
		agencyList.innerHTML = listMeat+'</ul>';
		 
		}) //end .then
		.then ( function() {
			let indAgency = document.querySelectorAll('#collection-list li a');
			for (i=0; i < indAgency.length; i++) { //begin loop2 to add document links
			indAgency[i].addEventListener('click', function(event) { //load and display doc list
				getDocs(event);
			}) 
			}  //end loop2
		 }); //end .then, end fetch
function getDocs(event) { //load and display doc list
  let theID = event.target.id;
  let theList = document.querySelector('#agency-'+theID);
  if (theList.innerHTML == '') { //#if1 check to make sure this list hasn't already been loaded
	event.preventDefault();
	console.log('if!');
	fetch('https://cdm16884.contentdm.oclc.org/digital/api/search/collection/'+theID+'?startPage=1&count=999')
	.then(function(response) { //.then1
		return response.json();
	  }) //end .then1
	  .then (function(data) { //.then2
	
	  let listResults = '';
			  for (i = 0 ; i < data.items.length; i++) { //begin loop1
		  var regex = /\/singleitem/;
		  recURL = data.items[i].itemLink.split(regex);
		  listResults += '<li><a href="/digital'+recURL+'">'+data.items[i].title+'</a></li>'
		} //end loop1
	   theList.innerHTML = listResults;
	      location.hash = '#agency-'+theID;
	  }); //end .then2
} //end #if1
else {console.log('else!');}


}
//end #AgencyList
}); //end cdm-home-page:enter event

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
		  for (i = 0 ; i < data.items.length; i++) { //begin loop
		  var regex = /\/singleitem/;
		  recURL = data.items[i].itemLink.split(regex)[1];
		  listResults += '<li><a href="/digital'+recURL+'">'+data.items[i].title+'</a></li>'
	   } //end loop
	
		  resultTarget = document.querySelector('.CollectionLanding-maincontentLanding');
		resultTarget.innerHTML += listResults+'</ul></div>';
		}) //end .then
	 
	}); //end :ready event listener

// } end #DocList



})(); //end namespace