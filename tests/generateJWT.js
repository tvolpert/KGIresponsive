var api_key = 'J6rSeNV1QsOV2R4jOFWZNQ';
var api_secret = 'dChRWqkPTeBRn2YfuMYkeJdkknZ0WDcdnM2L';
var expr = ((new Date()).getTime() + 20000);
var header = 
	'{"alg": "HS256","typ": "JWT"}';
var payload = '{"iss": "'+api_key+'","exp":'+expr+'}';


function base64UrlEncode(str) {
    // first we use encodeURIComponent to get percent-encoded UTF-8,
    // then we convert the percent encodings into raw bytes which
    // can be fed into btoa.
    return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g,
        function toSolidBytes(match, p1) {
            return String.fromCharCode('0x' + p1);
    }));
}

var token =  base64UrlEncode(header) + "." + base64UrlEncode(payload) + "." + api_secret;