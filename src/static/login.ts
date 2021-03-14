export default `
<html>
<head>
    <script type="text/javascript">
        window.onload = function () {
            if (window.location.pathname === '/oauth') {
                window.close();
                return;
            }
            window.location.href = 'oauth?' + window.location.hash.replace('#', '');
        };
    </script>
</head>

<body>
	<h1>Handling sign-in...</h1>
</body>

</html>
`;
