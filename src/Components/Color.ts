
const Color = {
  addopacity(v: string, opacity: number)
	{
		let r = v;
		const isrgb = v.includes("rgb(");
		const isrgba = v.includes("rgba(");
		const ishex = v.includes("#");
		if(isrgba)
		{
			r = v.substring(0, v.lastIndexOf(","))+", "+(opacity/255).toFixed(1)+")";
		}
		else if(ishex)
		{
			r = v.substring(0, 7)+""+Color.tohex(opacity);
		}
		else if(isrgb)
		{
			r = v.replace(")", ", "+(opacity/255).toFixed(1)+")");
			r = r.replace("rgb(", "rgba(");
		}
		return r;
	},
  
  tohex(opacity: number)
  {
    const hex = "0123456789ABCDEF";
    return hex.charAt((opacity - opacity % 16)/16) + hex.charAt(opacity % 16)
  },
  
  rgbaToHex(rgba: string): string {
    const result = rgba.match(/rgba?\((\d+),\s*(\d+),\s*(\d+),?\s*([\d\.]+)?\)/);
    if (!result) throw new Error("Invalid RGBA format");

    const r = parseInt(result[1]);
    const g = parseInt(result[2]);
    const b = parseInt(result[3]);
    const a = result[4] !== undefined ? Math.round(parseFloat(result[4]) * 255) : 255;

    const toHex = (n: number) => n.toString(16).padStart(2, '0');
    
    return `#${toHex(r)}${toHex(g)}${toHex(b)}${a !== 255 ? toHex(a) : ''}`;
  }
}

export default Color;