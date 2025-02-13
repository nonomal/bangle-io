function addToWorkspaces(obj, packageName) {
  const workspaces = [...new Set(obj.workspaces || [])];
  workspaces.push(packageName);
  obj.workspaces = workspaces.sort();
  return obj;
}
module.exports = function main(plop) {
  // controller generator
  plop.setGenerator('js-lib', {
    description: 'application controller logic',
    prompts: [
      {
        type: 'input',
        name: 'name',
        message: 'controller name please',
      },
    ],
    actions: [
      {
        type: 'add',
        path: 'js-lib/{{name}}/package.json',
        templateFile: 'tooling/plop-templates/new-js-lib/package-json.hbs',
      },
      {
        type: 'add',
        path: 'js-lib/{{name}}/index.ts',
        templateFile: 'tooling/plop-templates/new-js-lib/index-ts.hbs',
      },

      {
        type: 'modify',
        path: 'js-lib/package.json',
        transform: (fileContents, data) => {
          console.log(data);
          return JSON.stringify(
            addToWorkspaces(JSON.parse(fileContents), data.name),
            null,
            2,
          );
        },
      },
    ],
  });
};
