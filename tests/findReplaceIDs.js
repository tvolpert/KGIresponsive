let regex = /\/viewfeed\/collection\/(.*?)"/;
let bloop = document.querySelectorAll('#treemenu1 .agency-container .agency-docs');

bloop.forEach(function(item) {
	if (item.innerHTML.match(regex)) {
		item.parentElement.id = item.innerHTML.match(regex)[1];
	}  
});

let blap = document.querySelectorAll('.agency-container a.agency-name');

blap.forEach(function(item) {
	let link = item.parentElement.id;
	item.href = '#'+link;
});
