var collID;

document.addEventListener('cdm-collection-landing-page:ready', function(e){
    // e is instance of CustomEvent
    console.log(e.detail.collectionId); // {collectionId: '...'}
	collID = e.detail.collectionId;
		fetch('https://cdm16884.contentdm.oclc.org/digital/api/search/collection/'+collID)
	.then(function(response) {
    return response.json();
  })
  .then(function(data) {
   for (i = 0 ; i < data.items.length; i++) {
	   console.log (data.items[i].title +': '+  data.items[i].itemLink)
   }
	
	})
    // ...
});


document.addEventListener('cdm-app:ready', function(e){
    // application ready to use 
    // e is instance of CustomEvent 
	console.log('hmmm...');
});

