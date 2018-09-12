(function() { //begin namespace
var listMeat;
document.addEventListener('cdm-app:ready', function(e) {

}); 
document.addEventListener('cdm-home-page:ready', function(e){
	//populate home page with our layout:
	let mainContent = document.querySelector('.cdm-main-content');
	mainContent.innerHTML += '<section id="agencyList" class="shared-box"><h1>Browse Collections by Agency</h1></section><section id="askALibrarian"><iframe name="cwindow" src="https://us.libraryh3lp.com/chat/slkreference@chat.libraryh3lp.com?skin=18078&identity=Lib"></iframe></section>';

			fetch('https://cdm16884.contentdm.oclc.org/digital/api/collections?startPage=1&count=999')
		.then(function(response) {
		return response.json();
	  }) //end .then
	  .then(function(data) {
		listMeat='<ul id="collection-list">';
		for (i = 0 ; i < data.cards.length; i++) { //begin loop1 to populate list
			let agencyName = data.cards[i].title;
			var theID = data.cards[i].alias;
			listMeat += '<li class="agency-name" id="agency-'+theID+'"><a href="#agency-'+theID+'" id="'+theID+'">'+agencyName+'</a><ul class="agency-docs"></ul></li>';
	   } //end loop1
}) //end .then
	
	
.then(function() { //#AgencyList generate list of agencies/collections for front page
			let agencyList= document.querySelector('#agencyList');
	agencyList.innerHTML += listMeat+'</ul>';
	document.querySelector('.alert.alert-info').remove(); //delete cdms busted loading box
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
  if (theList.innerHTML == '') { console.log(theList); //#if1 check to make sure this list hasn't already been loaded
	event.preventDefault();
	theContainer.classList.add('loading');
	console.log('if!');
	fetch('https://cdm16884.contentdm.oclc.org/digital/api/search/collection/'+theID+'?startPage=1&count=999')
	.then(function(response) { //.then1
		return response.json();
	  }) //end .then1
	  .then (function(data) { //.then2
	
	  let listResults = '';
			  for (i = 0 ; i < data.items.length; i++) { //begin loop3
		  var regex = /\/singleitem/;
		  recURL = data.items[i].itemLink.split(regex);
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