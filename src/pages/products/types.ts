interface Status {
    code: string;
    value: any;  // Adjust this if you want more specific types for the value
  };
  
  export type Product  = {
    id: string;
    name: string;
    city: string;
    state: string;
    product_type: string;
    cliente: string;
    drive: string;
    online: boolean;
    icon: string;
    status: Status[];
    lat: number;
    lon: number;
    // Allow dynamic properties (strings) to be added to a product object
    [key: string]: any;  // This allows any string as a key on the product object
  }