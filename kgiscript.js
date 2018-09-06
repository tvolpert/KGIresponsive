document.addEventListener('cdm-collection-landing-page:ready', function(e){
    // e is instance of CustomEvent
    console.log(e); // {collectionId: '...'}
	console.log('this worked, tim');
    // ...
});


document.addEventListener('cdm-app:ready', function(e){
    // application ready to use 
    // e is instance of CustomEvent 
	console.log('hmmm...');
});