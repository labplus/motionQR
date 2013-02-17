

jQuery(document).ready(function($) {

var body = $('body'),
	pages = body.find('div.page'),
	qr = new JSQR(),
	option = {
		encode: 2,
		version: 24,
		errorCorrection: 1,
		mode: 4,
		fps: 6
	};

//page change handler
$('body').bind('keydown', function(e){
	if(e.keyCode == 32){
		paging();
	}
});

//page change
var paging = function(){
	var current = pages.filter(':visible:first');
	var next = current.next();
	if(next[0].className != ''){
		current.fadeOut();
		next.fadeIn();
	}
}


//helper
var fillZero = function(num, degit){
	var text = '';
	for(var i = degit - 1; i > 0; i--){
		var d = Math.pow(10, i);
		if(num < d){
			text += '0';
		}
	}
	text += num;
	return text;
}

//MAX DATA SIZE
//MAXDATASIZE[version][errorCorrection]
//errorcollection: [M,L,H,Q]
var MAXDATASIZE = [
	[0,0,0,0],//version 0 does not exist.
	[14,17,7,11],
	[26,32,14,20],
	[42,53,24,32],
	[62,78,34,46],
	[84,106,44,60],
	[106,134,58,74],
	[122,154,64,86],
	[152,192,84,108],
	[180,230,98,130],
	[213,271,119,151],
	[251,321,137,177],
	[287,367,155,203],
	[331,425,177,241],
	[362,458,194,258],
	[412,520,220,292],
	[450,586,250,322],
	[504,644,280,364],
	[560,718,310,394],
	[624,792,338,442],
	[666,858,382,482],
	[711,929,403,509],
	[779,1003,439,565],
	[857,1091,461,611],
	[911,1171,511,661],
	[997,1273,535,715],
	[1059,1367,593,751],
	[1125,1465,625,805],
	[1190,1528,658,868],
	[1264,1628,698,908],
	[1370,1732,742,982],
	[1452,1840,790,1030],
	[1538,1952,842,1112],
	[1628,2068,898,1168],
	[1722,2188,958,1228],
	[1809,2303,983,1283],
	[1911,2431,1051,1351],
	[1989,2563,1093,1423],
	[2099,2699,1139,1499],
	[2213,2809,1219,1579],
	[2331,2953,1663,1273]
];



//load file & create motionQR
var loadFile = function(file, onQRcodesCallback, onImageCallback){
	//encode option
	option.encode = parseInt($('#encode').val(), 10);
	option.version = parseInt($('#version').val(), 10);
	option.errorCorrection = parseInt($('#errorCorrection').val(), 10);
	option.mode = parseInt($('#mode').val(), 10); //2: code.ENCODE_MODE.BYTE;
	option.fps = parseInt($('#fps').val(), 10);

	//show original image
	onImageCallback(window.URL.createObjectURL(file));


	//load file by FileReader
	var byte_reader = new FileReader();
	byte_reader.onload = function() {
		var binary = byte_reader.result;

		//base64 encoding
		if(option.encode == 1){
			var src = base64encode(binary);		
		}
		else{
			var src = binary;
		}

		//slice data
		var length = src.length;
		var maxsize = MAXDATASIZE[option.version][option.errorCorrection];
		var size = maxsize - 6; //index/max用に4バイト削る
		var arraynum = Math.ceil(length / size);
		var doing = true;
		var ary = [];
		for(var i = 0; i < length; i += size){
			var temp = src.slice(i, i + size);
			//add header
			//encode mode: base64 or binary
			//1:base64
			//2:binary
			if(option.encode == 1){	
				var header = fillZero(ary.length, 3) + fillZero(arraynum, 3);
			}
			else{
				var indexByte = String.fromCharCode(ary.length);
				var maxByte = String.fromCharCode(arraynum);
				var header = indexByte + maxByte;
			}
			temp = header + temp;
			ary.push(temp);
		}

		//convert each base64 text to QR image
		var imgs = [];
		var ds = [];
		for(var i = 0; i < ary.length; i++){
			var data = ary[i];

			var obj = makeSingleQR(data, option);
			var dfd = obj.dfd;
			var img = obj.img;

			imgs.push(img);
			ds.push(dfd);
		}

		//wait all QRcodes
		$.when.apply(null, ds).done(function(){
			onQRcodesCallback(imgs);
		}).fail(function(){
			console.log('failed.');
		})
	};
	byte_reader.readAsBinaryString(file);
}

//make single QR <img>
var makeSingleQR = function(data, option){
	var d = new $.Deferred;
	var qr = drawQR(data, option);//canvas
	var img = new Image();
	img.onload = (function(d){
		var dfd = d;
		return function(){
			console.log(this.src + ' is loaded.')
			dfd.resolve();
		}
	})(d);
	img.src = qr.toDataURL();
	return {img:img, dfd:d.promise()};
}

//QRcode drawer
var drawQR = function(data, option){
	var code = new qr.Code();                              // Initialize a new Code object.
	code.encodeMode = option.mode;// || code.ENCODE_MODE.BYTE;  // Set the code datatype.
	code.version = option.version;// || 20; //code.DEFAULT; // Set the code version(DEFAULT = use the smallest possible version).
	code.errorCorrection = option.errorCorrection;// || code.ERROR_CORRECTION.H;        // Set the error correction level (H = High).

	var input = new qr.Input();                            // Initialize a new Input object.
	input.dataType = input.DATA_TYPE.TEXT;                 // Specify the data type of 'data'.Here, 'data' contains only text.
	input.data = data; //'http://www.jsqr.de';                     // Specify the data which should be encoded.

	var matrix = new qr.Matrix(input, code);               // Initialize a new Matrix object using the input
	                                                      // and code, defined above.
	                                                      // At this point, the QR Code get generated.
	var cellsize = 17 + (code.version * 4);
	matrix.scale = Math.ceil(600 / cellsize);
//	matrix.scale = 6;                                      // Specify the scaling for graphic output.
	matrix.margin = 2;                                     // Specify the margin for graphic output.

	var canvas = document.createElement('canvas');         // Create a new Canvas element.
	canvas.setAttribute('width', matrix.pixelWidth);       // Set the canvas width to the size of the QR code.
	canvas.setAttribute('height', matrix.pixelWidth);      // Set the canvas height to the size of the QR code.
	canvas.getContext('2d').fillStyle = 'rgb(0,0,0)';      // Set the foreground color of the canvas to black.
	matrix.draw(canvas, 0, 0);                             // Draw the QR code into the canvas
	
	return canvas;                                                      // at position 0 (left), 0 (top).
}


//FileAPI handler
var handleFiles = function(files){
	var file = files[0];

	//load file & onload Callback
	loadFile(file, 
		//onQRcodesCallback
		function(imgs){
			$('#settings').hide();

			console.log('all images are loaded.');
			for(var i = 0; i < imgs.length; i++){
				var img = imgs[i];
				$('#test').append(img);
			}
			//single QR image
			var singleQRimage = document.createElement("img");
			singleQRimage.src = imgs[0].src;
			$('#singleqr').append(singleQRimage);

			//start animation
			var index = 0;
			var wait = Math.floor(1000 / option.fps);
			setInterval(function(){
				var oldindex = index;
				index = (index + 1) % imgs.length;
				var oldimg = imgs[oldindex];
				var nextimg = imgs[index];
				$(oldimg).hide();
				$(nextimg).show();
				//index
			//	$('#title').html('(' + index + '/' + imgs.length + ')');
			}, wait);

			//paging
			paging();
		}, 
		//onImageCallback
		function(objectURL){
			console.log(objectURL);
			var img = document.createElement("img");
			img.src = objectURL;
			img.onload = function(e) {
				window.URL.revokeObjectURL(this.src);
			}
			$('#originalimage').append(img);
		}
	);
}

window.handleFiles = handleFiles;

});

