const Xls = {
  start(html: string)
  {
    const template = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40"><head><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>{worksheet}</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--><meta http-equiv="content-type" content="text/plain; charset=UTF-8"/></head><body><table>{html}</table></body></html>';
    const format = (s: any, c: any)=> {
			return s.replace(/{(\w+)}/g, function(m: any, p: any) { return c[p]; }); 
		}
    const ctx = {worksheet:"data", html};
    return format(template, ctx);
  }
}

export default Xls