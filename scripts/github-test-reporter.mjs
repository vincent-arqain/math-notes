import {inspect} from 'node:util';

const escape=value=>String(value).replaceAll('%','%25').replaceAll('\r','%0D').replaceAll('\n','%0A').replaceAll(',','%2C').replaceAll(':','%3A');

// Surface assertion details in the check annotations as well as the full logs.
export default async function* report(source){
  for await(const {type,data} of source){
    if(type==='test:fail'&&data.details?.error?.failureType!=='subtestsFailed'){
      yield `::error title=${escape(data.name)}::${escape(inspect(data.details.error,{depth:6}))}\n`;
    }
  }
}
