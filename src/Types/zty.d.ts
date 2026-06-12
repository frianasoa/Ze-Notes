declare namespace zty {
  type Row = {
    id: any;
    itemid: any;
    key: any;
    title: any;
    date: any;
    journal: any;
    source: any;
    zpaths: string;
    [key: string]: any;
  };

	type ContextMenuData = {
		state?: string;
		label?: string;
		icon?: any;
    title?: string;
    iconColor?: string;
    textColor?: string;
    bgColor?: string;
    data?: any;
    type?: string;
    options?: any;
		onClick?:(item: ContextMenuData, celldata: Record<string, any>, event?: any) => void;
		onClose?:() => void;
		submenu?: Record<string, zty.ContextMenuData>;
	};

	type ItemData = {
		type?: string;
		key?: string;
		value?: string;
		text?: string;
		comment?: string;
		pagelabel?: string;
		image?: string;
		[key: string]: any;
};

	// Data describing the cell a context menu / action was invoked on.
	// Fields stay loosely typed while call sites are migrated; they document
	// the shape produced from the cell's data-* attributes.
	type CellData = {
		target?: any;       // HTMLElement the menu was opened on
		collectionid?: any; // string
		itemid?: any;       // number | string
		key?: any;          // string
		column?: any;       // string
		[key: string]: any;
	};

	// The context object threaded from Table.tsx through menus and actions.
	type MenuContext = {
		MenuItems?: any;
		setIsLoading?: (value: boolean) => void;
		setLoadingMessage?: (message: string) => void;
		[key: string]: any;
	};

	// Configuration describing one AI provider (OpenAI, Gemini, DeepSeek, Claude).
	type AiProviderConfig = {
		id: string;
		label: string;
		apikeypref: string;
		modelpref: string;
		defaultmodel: string;
		maxtokenpref?: string;
		systempref: string;
		defaultsystem: string;
		userpref: string;
		defaultuser: string;
		url: (model: string, apikey: string) => string;
		headers: (apikey: string) => Record<string, string>;
		// usercontents holds the user-role contents in order; prompt() passes
		// [userprompt, data] while correct() passes [text] only.
		payload: (params: { model: string; system: string; usercontents: string[]; maxtoken: number }) => unknown;
		format: (data: any) => string[];
		modelsurl?: (apikey: string) => string;
		modelsheaders?: (apikey: string) => Record<string, string>;
		staticmodels?: { data: { id: string }[] };
		errormodels?: { data: { id: string }[] };
	};

	// One AI menu entry target (cell, row, column, table, note, ...).
	type AiMenuTarget = {
		key: string;
		label: string;
		target: string;
		icon?: any;
	};

	// A sortable column entry used by the sort dialogs.
	type SortColumn = {
		value: string;
		reversed?: boolean;
		hidden?: boolean;
		bgcolor?: string;
		textcolor?: string;
		[key: string]: any;
	};

}

type Position = "absolute" | "relative" | "fixed" | "sticky" | "static";
