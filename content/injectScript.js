const INJECT_SCRIPT = `
    window._getReactData = function() {
        function findReactRoot(node) {
            const key = Object.keys(node).find(key => 
                key.startsWith('__reactContainer$') || 
                key.startsWith('__reactFiber$')
            );
            return key ? node[key] : null;
        }

        function getReactFiber(element) {
            for (const key in element) {
                if (key.startsWith('__reactFiber$')) {
                    return element[key];
                }
            }
            return null;
        }

        function searchReactDOM(fiber, targetClassName) {
            if (!fiber) return null;

            if (fiber.stateNode && fiber.stateNode.classList && 
                fiber.stateNode.classList.contains(targetClassName)) {
                return {
                    props: fiber.memoizedProps,
                    state: fiber.memoizedState,
                    type: fiber.type?.name || 'Unknown'
                };
            }

            let child = fiber.child;
            while (child) {
                const result = searchReactDOM(child, targetClassName);
                if (result) return result;
                child = child.sibling;
            }

            return null;
        }

        const element = document.querySelector('.question_content');
        if (!element) return null;

        const rootElement = document.querySelector('#root') || document.body;
        const rootFiber = findReactRoot(rootElement);
        if (!rootFiber) return null;

        return searchReactDOM(rootFiber, 'question_content');
    };
`;
