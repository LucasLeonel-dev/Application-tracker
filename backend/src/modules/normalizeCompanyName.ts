export function normalizeCompanyName (name: string){
    return name.trim().toUpperCase().replace(/\s+/g,""); //trim tira espaço, uppercase deixa letra maiuscula, regex ache todo bloco de um-ou-mais espaços consecutivos, em qualquer lugar da string, repetidamente
}