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