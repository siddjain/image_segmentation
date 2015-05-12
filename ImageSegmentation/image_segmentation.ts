class Segment
{
    public sum: number[] = [];
    public mean: number[] = [];
    public pixels: number = 0;
    
    constructor(channels: number)
    {
        this.sum = new Array(channels);
        this.mean = new Array(channels);
        for (var i = 0; i < channels; i++)
        {
            this.sum[i] = this.mean[i] = 0;
        }
    }    
}

class App
{
    private _canvas1: HTMLCanvasElement;
    private _canvas2: HTMLCanvasElement;
    private _rows: number;
    private _cols: number;
    private _mask: number[][];
    private _bmpData1: number[];
    private _bmpData2: number[];
    private _qx: number[];
    private _qy: number[];    
    private _segment: Segment;
    private _segmentId: number;
    private _tolerance: number;
    private _remainder: number;
    private _channels: number;

    constructor(canvas1: string, canvas2: string) {
        this._canvas1 = <HTMLCanvasElement> document.getElementById(canvas1);
        this._canvas2 = <HTMLCanvasElement> document.getElementById(canvas2);
    }

    public uploadImage(ev: any): void {
        var reader = new FileReader();
        reader.onload = (event: any) => {
            var img = new Image();
            img.onload = () => {
                var canvas = this._canvas1;
                var ctx = canvas.getContext("2d");
                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0);
                App._clearCanvas(this._canvas2);
            }
            img.src = event.target.result;
        }
        reader.readAsDataURL(ev.target.files[0]);
    }


    private static _clearCanvas(canvas: HTMLCanvasElement): void {
        var width = canvas.width;
        var height = canvas.height;
        canvas.getContext("2d").clearRect(0, 0, width, height);
    }

    public segment(tolerance: number): void {
        this._tolerance = tolerance / 100 * 255;
        var canvas = this._canvas1;
        var canvas2 = this._canvas2;
        var width = canvas.width;
        var height = canvas.height;
        var n = width * height;
        this._rows = height;
        this._cols = width;
        this._remainder = n;
        var ctx = canvas.getContext("2d");
        this._bmpData1 = ctx.getImageData(0, 0, width, height).data;
        canvas2.width = width;
        canvas2.height = height;
        var ctx2 = canvas2.getContext("2d");
        var imgData2 = ctx2.createImageData(width, height);
        this._bmpData2 = imgData2.data;
        this._mask = new Array(height);
        this._channels = 4;
        for (var i = 0; i < height; i++)
        {
            this._mask[i] = new Array(width);
            for (var j = 0; j < width; j++)
            {
                this._mask[i][j] = -1;
            }
        }
        var segments: Segment[] = new Array();
        this._segmentId = 0;
        while (this._remainder)
        {
            this._segment = new Segment(this._channels);
            segments.push(this._segment);
            this._initialize();            
            for (i = 0; i < this._qx.length; i++)
            {
                var x = this._qx[i];
                var y = this._qy[i];
                if (this._mask[y][x] !== -2)
                {
                    var debug = 1;
                }
                this._mask[y][x] = -1;
                this._segmentPixel(x, y);                
            }
            for (i = 0; i < this._qx.length; i++)
            {
                x = this._qx[i];
                y = this._qy[i];
                var k = (y * this._cols + x) * 4;
                for (j = 0; j < this._channels; j++)
                {
                    this._bmpData2[k++] = this._segment.mean[j];
                }
            }
            this._segmentId++;
        }       
        ctx2.putImageData(imgData2, 0, 0);
    }

    private _initialize(): void
    {
        var i = Math.floor(Math.random() * this._remainder);
        var x = -1;
        var y = -1;
        var j = 0;
        for (var row = 0; row < this._rows; row++)
        {
            for (var col = 0; col < this._cols; col++)
            {
                if (this._mask[row][col] === -1)
                {
                    if (j === i)
                    {
                        this._qx = [col];
                        this._qy = [row];
                        this._mask[row][col] = -2; // to mark that it is in the queue
                        return;
                    }
                    j++;
                }
            }
        }
        throw "invalid operation exception";
    }

    private static getRandomInt(start: number, end: number): number {
        return start + Math.round(Math.random() * (end - start));
    }
  
    private _segmentPixel(x: number, y: number): void
    {
        var color = this._getColor(this._bmpData1, x, y);
        var max = 0;
        var i = 0;
        var segment = this._segment;
        for (i = 0; i < this._channels; i++)
        {
            var diff = Math.abs(color[i] - segment.mean[i]);
            if (diff > max)
            {
                max = diff; 
            }
        }
        if (max <= this._tolerance || segment.pixels === 0)
        {
            this._mask[y][x] = this._segmentId;
            this._remainder--;
            if (this._remainder === 0)
            {
                var debug = 1;
            }
            segment.pixels++;
            for (i = 0; i < this._channels; i++)
            {
                segment.sum[i] += color[i];
                segment.mean[i] = segment.sum[i] / segment.pixels;
            }
            var neighbors = this._getNeighbors(x, y);
            for (i = 0; i < neighbors.count; i++)
            {
                this._qx.push(neighbors.x[i]);
                this._qy.push(neighbors.y[i]);
            }
        }        
    }

    private _getColor(imageData: number[], x: number, y: number): number[]
    {
        var k = (y * this._cols + x) * 4;
        return [imageData[k], imageData[k + 1], imageData[k + 2], imageData[k + 3]];
    }

    private _getNeighbors(x: number, y: number)
    {
        var u: number[] = [];
        var v: number[] = [];
        this._test(x - 1, y, u, v);
        this._test(x + 1, y, u, v);
        this._test(x, y - 1, u, v);
        this._test(x, y + 1, u, v);
        return { x: u, y: v, count: u.length };
    }

    private _test(x: number, y: number, u: number[], v: number[]): void
    {
        if (x >= 0 && x < this._cols && y >= 0 && y < this._rows && this._mask[y][x] === -1)
        {
            this._mask[y][x] = -2; // to mark that it is in the queue
            u.push(x);
            v.push(y);
        }
    }
}

window.onload = () => {
    var app = new App("canvas1", "canvas2");
    var vm =
        {
            uploadImage: function (data, event) {
                app.uploadImage(event);
            },
            segment: function () {
                app.segment(vm.tolerance());
            },
            tolerance: ko.observable(10)
        };
    ko.applyBindings(vm);
};